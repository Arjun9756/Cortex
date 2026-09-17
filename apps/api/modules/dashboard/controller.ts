import sql from '../../config/postgres.js'
import { driver, neo4jSession } from '../../config/neo4j.js'
import { calculateKnowledgeRisk } from '../../../../packages/analytics/knowledge.service.js'
import { calculateSuccessorCandidates, calculateSuccessorsByRepo } from '../../../../packages/analytics/successor.service.js'
import { Request, Response } from 'express';
import { RISK_THRESHOLDS } from '../../../../packages/shared/riskThresholds.js';

// ─── Existing endpoints ────────────────────────────────────────────

export async function getTechnologiesHelper() {
    let technologies: any[] = await sql`SELECT * FROM technology_metrics ORDER BY usage_percent DESC`;

    // Neo4j Fallback & Auto-Sync if Postgres technology_metrics table is empty
    if (!technologies || technologies.length === 0) {
        const session = driver.session();
        try {
            const totalRepoRes = await session.run(`MATCH (r:REPOSITORY) RETURN count(r) AS totalRepos`);
            const totalRepos = totalRepoRes.records[0]?.get('totalRepos')?.toNumber() ?? 0;

            const neoTechRes = await session.run(`
                MATCH (t:TECHNOLOGY)
                OPTIONAL MATCH (p:PERSON)-[]-(e)-[:MENTIONED_IN|USES]-(t)
                OPTIONAL MATCH (t)-[:MENTIONED_IN|USES]-(e2)-[:PART_OF]->(r:REPOSITORY)
                RETURN t.name AS tech_name,
                       count(DISTINCT p) AS contributor_count,
                       count(DISTINCT r) AS repo_count
                ORDER BY contributor_count DESC
            `);
            if (neoTechRes.records.length > 0) {
                technologies = neoTechRes.records.map((rec: any) => {
                    const repoCount = rec.get('repo_count')?.toNumber() || 0;
                    const usagePercent = totalRepos > 0 ? Math.round((repoCount / totalRepos) * 100) : 0;
                    return {
                        tech_name: rec.get('tech_name'),
                        usage_percent: usagePercent,
                        repo_count: repoCount,
                        contributor_count: rec.get('contributor_count')?.toNumber() || 0,
                        top_experts: []
                    };
                });
            }
        } catch (cyErr: any) {
            console.warn('[TechnologiesHelper] Neo4j technology fallback warning:', cyErr?.message);
        } finally {
            await session.close();
        }
    }

    // Deduplicate case variants if any transient duplicates exist
    const seen = new Set<string>();
    const uniqueTechs: any[] = [];
    for (const t of (technologies || [])) {
        const name = (t.tech_name || t.technology_name || 'Tech').trim();
        const key = name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            uniqueTechs.push({
                ...t,
                tech_name: name,
                contributor_count: Number(t.contributor_count ?? 0)
            });
        }
    }
    return uniqueTechs;
}

export async function getDashboardOverview(req: Request, res: Response) {
    try {
        const [workspace] = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;
        const repos = await sql`SELECT * FROM repo_metrics ORDER BY risk_score DESC`;
        const people = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC`;
        const technologies = await getTechnologiesHelper();

        // 1. Compute Composite Headline Health Score (0-100)
        // Filter out empty / scaffold repositories (0 commits or status = 'empty')
        // Only real active repositories with commits should affect company health & SPOF
        const totalRepos = repos.length;
        const activeRepos = repos.filter((r: any) => 
            r.status !== 'empty' && r.status !== 'scaffold' && Number(r.risk_score) > 0 && Number(r.bus_factor) > 0
        );
        const totalActiveRepos = activeRepos.length;

        const spofRepos = activeRepos.filter((r: any) => Number(r.bus_factor) <= 1);
        const spofPct = totalActiveRepos > 0 ? (spofRepos.length / totalActiveRepos) * 100 : 0;

        const sumBusFactor = activeRepos.reduce((acc: number, r: any) => acc + Number(r.bus_factor ?? 0), 0);
        const avgBusFactor = totalActiveRepos > 0 ? sumBusFactor / totalActiveRepos : (Number(workspace?.bus_factor_avg) || 0);

        const sumKnowledgeRisk = people.reduce((acc: number, p: any) => acc + Number(p.risk_score ?? 0), 0);
        const avgKnowledgeRisk = people.length > 0 ? sumKnowledgeRisk / people.length : (Number(workspace?.knowledge_risk_avg) || 0);

        // Weighted Risk Penalty Calculation: 35% Knowledge Risk, 35% SPOF Repos %, 30% Low Bus Factor Penalty
        const busFactorPenalty = Math.max(0, 100 - avgBusFactor * 25);
        const compositeRisk = Math.round(0.35 * avgKnowledgeRisk + 0.35 * spofPct + 0.30 * busFactorPenalty);
        const healthScoreValue = Math.max(0, Math.min(100, 100 - compositeRisk));

        let grade = 'A';
        let statusText = 'Optimal Health';
        let statusColor = 'emerald';
        if (healthScoreValue < 50) {
            grade = 'D';
            statusText = 'Critical Action Required';
            statusColor = 'rose';
        } else if (healthScoreValue < 70) {
            grade = 'C';
            statusText = 'Elevated Risk Concentration';
            statusColor = 'amber';
        } else if (healthScoreValue < 85) {
            grade = 'B';
            statusText = 'Moderate Operational Health';
            statusColor = 'indigo';
        }

        const healthScore = totalRepos === 0 && people.length === 0 ? null : {
            score: healthScoreValue,
            grade,
            statusText,
            statusColor,
            explanation: `Based on ownership concentration (avg bus factor: ${avgBusFactor.toFixed(1)}, ${spofRepos.length} repos at bus factor 1) and activity across ${people.length} contributors and ${totalActiveRepos} active repositories (${totalRepos} total).`,
            breakdown: {
                avgBusFactor: Number(avgBusFactor.toFixed(1)),
                avgKnowledgeRisk: Math.round(avgKnowledgeRisk),
                spofRepoCount: spofRepos.length,
                totalRepos,
                activeRepoCount: totalActiveRepos
            }
        };

        // 2. Fetch Activity Trend (Weekly Aggregation over last 8 weeks)
        let activityTrend: Array<{ week: string; count: number; commits: number; prs: number }> = [];
        try {
            const rawWeekly = await sql`
                SELECT 
                    date_trunc('week', created_at) AS week_start,
                    count(*)::int AS count,
                    COALESCE(SUM(
                        CASE 
                            WHEN (event_type ILIKE '%commit%' OR event_type ILIKE '%push%') THEN 
                                COALESCE(
                                    CASE 
                                        WHEN jsonb_typeof(payload->'commits') = 'array' THEN jsonb_array_length(payload->'commits') 
                                        ELSE 1 
                                    END, 
                                    1
                                )
                            ELSE 0 
                        END
                    ), 0)::int AS commits,
                    COUNT(DISTINCT 
                        CASE 
                            WHEN (event_type ILIKE '%pull%' OR event_type ILIKE '%pr%') THEN 
                                COALESCE(payload->'pull_request'->>'id', payload->>'pr_id', id) 
                        END
                    )::int AS prs
                FROM events
                WHERE created_at >= NOW() - INTERVAL '12 weeks'
                GROUP BY 1
                ORDER BY week_start ASC
            `;

            if (rawWeekly && rawWeekly.length > 0) {
                rawWeekly.forEach((row: any, idx: number) => {
                    const d = new Date(row.week_start);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
                    activityTrend.push({
                        week: label,
                        count: Number(row.count || 0),
                        commits: Number(row.commits || 0),
                        prs: Number(row.prs || 0)
                    });
                });
            }
        } catch (actErr: any) {
            console.warn('[DashboardOverview] Activity trend fetch warning:', actErr?.message);
        }

        // If no weekly activity trend data exists in database, keep empty
        if (!activityTrend) {
            activityTrend = [];
        }

        // 3. Risk Alerts (Top 3-5 Urgent Action Items)
        const riskAlerts: Array<{
            id: string;
            severity: 'critical' | 'warning' | 'info';
            category: 'Bus Factor' | 'Knowledge Risk' | 'PR Risk' | 'Skill Dependency';
            entityName: string;
            entityType: 'repo' | 'person' | 'tech' | 'pr';
            whyItMatters: string;
            riskScore: number;
        }> = [];

        // Repos with bus factor = 1
        for (const repo of spofRepos) {
            riskAlerts.push({
                id: `spof-${repo.repo_name}`,
                severity: 'critical',
                category: 'Bus Factor',
                entityName: repo.repo_name,
                entityType: 'repo',
                whyItMatters: `Single point of failure — repository relies on a single key contributor (Bus Factor: 1).`,
                riskScore: repo.risk_score || 90
            });
        }

        // People with knowledge risk >= HIGH (40%)
        const highRiskPeople = people.filter((p: any) => (p.risk_score ?? 0) >= RISK_THRESHOLDS.HIGH);
        for (const p of highRiskPeople) {
            const reposList = Array.isArray(p.repos) ? p.repos.join(', ') : 'core modules';
            riskAlerts.push({
                id: `person-${p.external_id || p.person_name}`,
                severity: p.risk_score >= RISK_THRESHOLDS.CRITICAL ? 'critical' : 'warning',
                category: 'Knowledge Risk',
                entityName: p.person_name,
                entityType: 'person',
                whyItMatters: `Concentrates ${p.risk_score}% knowledge risk across ${reposList || 'key services'} with low co-author coverage.`,
                riskScore: p.risk_score
            });
        }

        // Technologies with 1 expert
        const singleExpertTechs = technologies.filter((t: any) => Number(t.contributor_count ?? 0) === 1);
        for (const t of singleExpertTechs) {
            const expertName = Array.isArray(t.top_experts) && t.top_experts.length > 0 ? t.top_experts[0].name : null;
            const techName = t.tech_name || t.technology_name || 'Tech';
            riskAlerts.push({
                id: `tech-${techName}`,
                severity: 'warning',
                category: 'Skill Dependency',
                entityName: techName,
                entityType: 'tech',
                whyItMatters: expertName
                    ? `Only 1 documented expert (${expertName}) maintaining ${techName} across the codebase.`
                    : `Only 1 documented contributor maintaining ${techName} across the codebase.`,
                riskScore: 65
            });
        }

        // Sort alerts by severity (critical > warning > info) and limit to top 5
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        riskAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.riskScore - a.riskScore);

        const topRiskAlerts = riskAlerts.slice(0, 5);

        // 4. Stats Summary
        const openPrsCount = workspace?.open_prs_count ?? 0;
        const stats = {
            repoCount: totalRepos,
            activeRepoCount: totalActiveRepos,
            peopleCount: people.length,
            techCount: technologies.length,
            avgBusFactor: Number(avgBusFactor.toFixed(1)),
            spofRepoCount: spofRepos.length,
            openHighRiskPrs: 0,
            totalRiskAlertsCount: riskAlerts.length
        };

        res.json({
            workspace,
            healthScore,
            stats,
            riskAlerts: topRiskAlerts,
            activityTrend,
            repos,
            people,
            technologies
        });
    } catch (err: any) {
        console.error('[DashboardOverview] Controller Error:', err);
        res.status(500).json({ error: 'Failed to fetch overview metrics', message: err?.message });
    }
}

export async function getPeoplePage(req: Request, res: Response) {
    const people = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC`;
    res.json({ people });
}

export async function getBusFactorPage(req: Request, res: Response) {
    const repos = await sql`SELECT * FROM repo_metrics ORDER BY bus_factor ASC`;
    res.json({ repos });
}

export async function getTechnologiesPage(req: Request, res: Response) {
    const tech = await getTechnologiesHelper();
    res.json({ technologies: tech });
}

export async function getTimeline(req: Request, res: Response) {
    const events = await sql`
        SELECT 
            id, 
            provider, 
            event_type,
            created_at,
            COALESCE(
                payload->'comment'->>'body',
                payload->'issue'->'fields'->>'summary',
                payload->'issue'->>'title',
                payload->'pull_request'->>'title',
                payload->'commit'->>'message',
                payload->'head_commit'->>'message',
                payload->'commits'->0->>'message',
                payload->>'text',
                payload->>'summary',
                payload->>'message'
            ) AS title,
            COALESCE(
                payload->'comment'->'user'->>'login',
                payload->'sender'->>'login',
                payload->'user'->>'displayName',
                payload->'issue'->'fields'->'reporter'->>'displayName',
                payload->'head_commit'->'author'->>'name',
                payload->'pusher'->>'name',
                payload->'author'->>'name',
                payload->>'user_name',
                payload->>'username',
                'System'
            ) AS author,
            COALESCE(
                payload->'comment'->>'created_at',
                created_at::text
            ) AS date,
            COALESCE(
                payload->'repository'->>'name',
                payload->'repository'->>'full_name'
            ) AS repo
        FROM events
        ORDER BY created_at DESC
        LIMIT 20
    `;
    res.json({ events });
}

// ─── Findings endpoint ─────────────────────────────────────────────
// Reads already-computed repo_metrics and person_metrics tables.
// Converts specific threshold conditions into structured "finding" objects.
// No new analytics calculations — just presentation/framing of existing data.

interface Finding {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    relatedEntity: string;
    relatedEntityType: 'repo' | 'person';
}

// Thresholds — easily tunable without re-reading all the logic
const BUS_FACTOR_CRITICAL_THRESHOLD = 1;    // bus_factor <= this triggers critical finding
const PERSON_RISK_HIGH_THRESHOLD = RISK_THRESHOLDS.HIGH;       // risk_score >= this triggers warning finding
const REPO_RISK_HIGH_THRESHOLD = 80;         // risk_score >= this triggers warning finding

export async function getFindings(req: Request, res: Response) {
    try {
        const findings: Finding[] = [];

        // 1. Bus factor critical: repos where bus_factor <= 1 (excluding empty / scaffold repos)
        const fragileRepos = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner
            FROM repo_metrics
            WHERE bus_factor <= ${BUS_FACTOR_CRITICAL_THRESHOLD}
              AND status NOT IN ('empty', 'scaffold')
              AND risk_score > 0
        `;

        // Ownership/risk findings deliberately use repo_metrics, the same source
        // as the dashboard and agent. Graph commit topology is enrichment only.
        for (const repo of fragileRepos) {
            const owner = repo.primary_owner || 'an unassigned owner';
            findings.push({
                severity: 'critical',
                title: 'Bus factor critical',
                description: `${repo.repo_name} depends entirely on ${owner} (bus factor: ${repo.bus_factor}, risk: ${repo.risk_score}%)`,
                relatedEntity: repo.repo_name,
                relatedEntityType: 'repo',
            });
        }

        // 2. Person knowledge risk high: risk_score >= 70
        const highRiskPeople = await sql`
            SELECT person_name, external_id, risk_score, repos, commit_count
            FROM person_metrics
            WHERE risk_score >= ${PERSON_RISK_HIGH_THRESHOLD}
        `;

        for (const person of highRiskPeople) {
            const repoCount = Array.isArray(person.repos) ? person.repos.length : 0;
            findings.push({
                severity: 'warning',
                title: 'Knowledge risk high',
                description: `${person.person_name}'s departure would put ${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'} and ${person.commit_count ?? 0} commits at risk (risk score: ${person.risk_score}%)`,
                relatedEntity: person.person_name,
                relatedEntityType: 'person',
            });
        }

        // 3. Repo risk score high: risk_score >= 80 (fragile status, excluding empty repos)
        const highRiskRepos = await sql`
            SELECT repo_name, risk_score, bus_factor, contributor_count
            FROM repo_metrics
            WHERE risk_score >= ${REPO_RISK_HIGH_THRESHOLD}
              AND bus_factor > ${BUS_FACTOR_CRITICAL_THRESHOLD}
              AND status NOT IN ('empty', 'scaffold')
        `;
        // ^ Excludes repos already flagged by bus-factor-critical above

        for (const repo of highRiskRepos) {
            findings.push({
                severity: 'warning',
                title: 'Repository health at risk',
                description: `${repo.repo_name} has a risk score of ${repo.risk_score}% with only ${repo.contributor_count ?? 0} contributors`,
                relatedEntity: repo.repo_name,
                relatedEntityType: 'repo',
            });
        }

        // Sort: critical first, then warning, then info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        res.json({ findings });
    } catch (error: any) {
        console.error('[Findings] Error:', error?.message);
        res.status(500).json({ error: 'Failed to compute findings', message: error?.message });
    }
}

// ─── Simulate Departure endpoint ───────────────────────────────────
// Calls calculateKnowledgeRisk directly for a person, bypassing the
// full LLM agent pipeline (planner → entity resolution → evidence → answer).
// This is significantly faster (~2-3s vs ~13s) since the person is
// already unambiguously identified by externalId from the UI.

export async function simulateDeparture(req: Request, res: Response) {
    try {
        const { externalId } = req.params;

        if (!externalId) {
            return res.status(400).json({ error: 'externalId parameter is required' });
        }

        // Look up person from person_metrics by external_id or person_name
        const [person] = await sql`
            SELECT person_name, external_id, risk_score, top_technologies, repos, commit_count
            FROM person_metrics
            WHERE external_id = ${externalId} OR person_name = ${externalId}
            LIMIT 1
        `;

        if (!person) {
            return res.status(404).json({ error: `Person with identifier "${externalId}" not found in person_metrics` });
        }

        // Call calculateKnowledgeRisk directly — no LLM agent pipeline
        // ALSO call calculateSuccessorsByRepo for per-repo successor recommendations
        // Person metrics are the durable source of truth. The graph calculation
        // adds evidence and successor scoring, but must not make this SQL-backed
        // detail endpoint fail during a Neo4j outage.
        let partial = false;
        let graphError: string | undefined;
        let riskResult: any;
        let successorsByRepo: any[] = [];
        try {
            [riskResult, successorsByRepo] = await Promise.all([
                calculateKnowledgeRisk(person.person_name),
                calculateSuccessorsByRepo(person.person_name)
            ]);
        } catch (error: any) {
            partial = true;
            graphError = error?.message || 'Neo4j enrichment unavailable';
            console.warn('[SimulateDeparture] Neo4j enrichment unavailable:', graphError);
            riskResult = {
                person: person.person_name,
                totalRisk: Number(person.risk_score ?? 0) / 100,
                breakdown: {},
                details: {},
                evidence: {}
            };
        }

        // Cross-reference stored person_metrics data for technologies and repos
        const affectedRepos: string[] = Array.isArray(person.repos) ? person.repos : [];
        const affectedTechnologies: Array<{ name: string; score: number }> = Array.isArray(person.top_technologies)
            ? person.top_technologies
            : [];

        res.json({
            person: riskResult.person,
            externalId: person.external_id,
            riskScore: Math.round(riskResult.totalRisk * 100),
            breakdown: riskResult.breakdown,
            details: riskResult.details,
            evidence: riskResult.evidence,
            affectedRepos,
            affectedTechnologies,
            commitCount: person.commit_count ?? 0,
            successorsByRepo,
            partial,
            graphError
        });
    } catch (error: any) {
        console.error('[SimulateDeparture] Error:', error?.message);
        res.status(500).json({ error: 'Failed to simulate departure', message: error?.message });
    }
}

function formatNeo4jDate(raw: any): string {
    if (!raw) return 'Recent';
    if (typeof raw === 'string') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? raw : d.toLocaleDateString();
    }
    if (typeof raw === 'number') {
        return new Date(raw).toLocaleDateString();
    }
    if (raw.low !== undefined && raw.high !== undefined) {
        const millis = raw.low + raw.high * 4294967296;
        return new Date(millis).toLocaleDateString();
    }
    return 'Recent';
}

export async function getRepoDetails(req: Request, res: Response) {
    const { repoName } = req.params;
    if (!repoName) {
        return res.status(400).json({ error: 'repoName parameter is required' });
    }

    try {
        // 1. Fetch from Postgres repo_metrics
        const [metric] = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status, computed_at
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${repoName})
            LIMIT 1
        `;

        // Metrics are the source of truth for this endpoint. A graph outage must
        // never turn an inspect request with a metrics row into an HTTP 500.
        if (!metric) {
            return res.status(404).json({ error: `Repository "${repoName}" not found in repo_metrics` });
        }

        let contributors: any[] = [];
        let technologies: string[] = [];
        let recentActivity: any[] = [];
        let graphAvailable = true;
        let graphError: string | undefined;

        // Graph data is optional enrichment. All graph calls share one failure
        // boundary so routing/DNS failures return the SQL metrics response.
        try {
        const session = neo4jSession();
        try {
        const contribsRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
            WHERE lower(r.name) = lower($repoName)
            WITH p, count(c) AS commits
            RETURN p.name AS name, p.email AS email, p.role AS role, commits
            ORDER BY commits DESC
        `, { repoName });

        contributors = contribsRes.records.map(rec => ({
            name: rec.get('name'),
            email: rec.get('email'),
            role: rec.get('role'),
            commitCount: rec.get('commits')?.toNumber?.() ?? Number(rec.get('commits'))
        }));

        const techRes = await session.run(`
            MATCH (r:REPOSITORY)
            WHERE lower(r.name) = lower($repoName)
            OPTIONAL MATCH (r)<-[:PART_OF|FIXED_BY*1..2]-(work)-[:USES|MENTIONED_IN|HAS_PROBLEM]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (r)<-[:WORKS_ON|CONTRIBUTED_TO]-(p:PERSON)-[:USES]->(t2:TECHNOLOGY)
            WITH collect(DISTINCT t1.name) + collect(DISTINCT t2.name) AS rawTechs
            RETURN [t in rawTechs WHERE t IS NOT NULL] AS technologies
        `, { repoName });

        const rawTechs = techRes.records[0]?.get('technologies') || [];
        technologies = [...new Set(rawTechs.filter(Boolean))] as string[];

        // 4. Fetch Recent Activity (commits / PRs)
        const activityRes = await session.run(`
            MATCH (r:REPOSITORY)<-[:PART_OF]-(work)
            WHERE lower(r.name) = lower($repoName) AND (work:COMMIT OR work:PULL_REQUEST)
            OPTIONAL MATCH (author:PERSON)-[:AUTHORED|CREATED]->(work)
            RETURN work.name AS title, work.hash AS hash, work.externalId AS externalId,
                   labels(work)[0] AS type,
                   coalesce(work.createdAt, work.created_at, work.timestamp) AS date,
                   author.name AS author
            ORDER BY date DESC
            LIMIT 10
        `, { repoName });

        recentActivity = activityRes.records.map(rec => ({
            title: rec.get('title') || rec.get('hash') || 'Code contribution',
            hash: rec.get('hash'),
            externalId: rec.get('externalId'),
            type: rec.get('type') || 'COMMIT',
            date: formatNeo4jDate(rec.get('date')),
            author: rec.get('author') || 'Team Contributor'
        }));

        } finally {
            await session.close();
        }
        } catch (error: any) {
            graphAvailable = false;
            graphError = error?.message || 'Neo4j enrichment unavailable';
            console.warn('[RepoDetails] Neo4j enrichment unavailable:', graphError);
        }

        const totalCommits = contributors.reduce((acc, c) => acc + c.commitCount, 0);
        const graphOwner = contributors[0] || null;
        const primaryOwner = metric.primary_owner
            ? { name: metric.primary_owner, ownershipPercentage: graphOwner && totalCommits > 0 ? Math.round((graphOwner.commitCount / totalCommits) * 100) : null, commitCount: graphOwner?.commitCount ?? null }
            : graphOwner ? { ...graphOwner, ownershipPercentage: totalCommits > 0 ? Math.round((graphOwner.commitCount / totalCommits) * 100) : 100 } : null;
        const busFactor = Number(metric.bus_factor ?? 0);
        const riskScore = Number(metric.risk_score ?? 0);
        const isSPOF = busFactor === 1;

        const factors: string[] = [];
        if (isSPOF) {
            factors.push(`Bus factor of ${busFactor} indicates a Single Point of Failure (SPOF).`);
            if (primaryOwner && graphOwner) {
                factors.push(`${primaryOwner.name} authored ${primaryOwner.ownershipPercentage}% (${primaryOwner.commitCount}/${totalCommits || 1}) of all indexed commits.`);
            } else if (primaryOwner) {
                factors.push(`${primaryOwner.name} is the primary owner recorded in the latest repository metrics.`);
            }
            if (contributors.length <= 1) {
                factors.push(`0 active co-maintainers or secondary reviewers found in graph records.`);
            }
        } else {
            factors.push(`Bus factor of ${busFactor} indicates distributed contributor coverage.`);
            factors.push(`${contributors.length} active contributors maintain this repository.`);
        }

        if (technologies.length > 0) {
            factors.push(`Relies on ${technologies.length} key stack technologies: ${technologies.slice(0, 4).join(', ')}${technologies.length > 4 ? '...' : ''}.`);
        }

        // 6. Find Suggested Backup Owners
        let suggestedBackups: any[] = [];
        if (primaryOwner && graphAvailable) {
            try {
                const succRes = await calculateSuccessorCandidates(primaryOwner.name);
                suggestedBackups = succRes.candidates.slice(0, 3).map(c => ({
                    name: c.name,
                    score: c.score,
                    sharedTechnologies: c.factors.sharedTechnologies,
                    sharedRepositories: c.factors.sharedRepositories,
                    capacityScore: c.breakdown.workloadCapacityScore,
                    rationale: c.rationale,
                    category: c.category,
                    warningLabel: c.warningLabel,
                    isOverloaded: c.isOverloaded,
                }));
            } catch (succErr: any) {
                console.warn('[RepoDetails] Successor calculation warning:', succErr?.message);
            }
        }

        const details = {
            repoName: metric?.repo_name || repoName,
            busFactor,
            riskScore,
            status: metric.status || (isSPOF ? 'fragile' : 'healthy'),
            contributorCount: contributors.length || metric?.contributor_count || 0,
            primaryOwner,
            contributors,
            technologies,
            recentActivity,
            riskExplanation: {
                summary: metric.status === 'empty'
                    ? 'Empty repository: no indexed contributors and no current ownership risk.'
                    : isSPOF
                    ? `Critical Single Point of Failure: ${primaryOwner?.name || 'Sole Contributor'} holds 100% of architectural knowledge.`
                    : `Distributed Repository: Maintained by ${contributors.length} contributors with acceptable redundancy.`,
                factors,
                isSPOF
            },
            suggestedBackups,
            partial: !graphAvailable,
            graphError: graphAvailable ? undefined : graphError
        };

        res.json(details);
    } catch (err: any) {
        console.error('[GetRepoDetails] Error:', err?.message);
        res.status(500).json({ error: 'Failed to fetch repository details', message: err?.message });
    }
}

export async function getIntegrationsStatus(req: Request, res: Response) {
    try {
        const counts = await sql`
            SELECT provider, count(*)::int as count 
            FROM events 
            GROUP BY provider
        `;
        const countMap: Record<string, number> = {};
        for (const row of counts) {
            if (row.provider) {
                countMap[row.provider.toLowerCase()] = Number(row.count) || 0;
            }
        }

        const githubConfigured = Boolean(process.env.GITHUB_SECRET && process.env.GITHUB_SECRET !== 'default_secret');
        const slackConfigured = Boolean(process.env.SLACK_SECRET && process.env.SLACK_SECRET !== 'default_secret');
        const jiraConfigured = Boolean(process.env.JIRA_SECRET && process.env.JIRA_SECRET !== 'default_secret');

        return res.json({
            status: true,
            integrations: {
                github: {
                    name: 'GitHub',
                    isConfigured: githubConfigured,
                    webhookUrl: '/api/github/webhook',
                    signatureHeader: 'X-Hub-Signature-256',
                    eventCount: countMap['github'] || 0,
                    secretMasked: githubConfigured ? '••••••••' : undefined
                },
                slack: {
                    name: 'Slack',
                    isConfigured: slackConfigured,
                    webhookUrl: '/api/slack/webhook',
                    signatureHeader: 'X-Slack-Signature',
                    eventCount: countMap['slack'] || 0,
                    secretMasked: slackConfigured ? '••••••••' : undefined
                },
                jira: {
                    name: 'Jira',
                    isConfigured: jiraConfigured,
                    webhookUrl: '/api/jira/webhook',
                    signatureHeader: 'X-Hub-Signature',
                    eventCount: countMap['jira'] || 0,
                    secretMasked: jiraConfigured ? '••••••••' : undefined
                }
            }
        });
    } catch (err: any) {
        console.error('[getIntegrationsStatus] Error:', err);
        return res.status(500).json({ status: false, error: 'Failed to fetch integrations status', message: err?.message });
    }
}

export async function updateIntegrationSecret(req: Request, res: Response) {
    const { provider } = req.params;
    const providerKey = typeof provider === 'string' ? provider.toUpperCase() : (Array.isArray(provider) && provider[0] ? String(provider[0]).toUpperCase() : 'PROVIDER');
    return res.status(501).json({
        status: false,
        error: `Dynamic secret updating is not supported by runtime. Please set ${providerKey}_SECRET in your server .env file.`
    });
}
