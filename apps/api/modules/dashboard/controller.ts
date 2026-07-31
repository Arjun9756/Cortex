import sql from '../../config/postgres.js'
import { driver } from '../../config/neo4j.js'
import { calculateKnowledgeRisk } from '../../../../packages/analytics/knowledge.service.js'
import { Request, Response } from 'express';

// ─── Existing endpoints ────────────────────────────────────────────

export async function getDashboardOverview(req: Request, res: Response) {
    const [workspace] = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;
    const repos = await sql`SELECT * FROM repo_metrics ORDER BY risk_score DESC LIMIT 4`;
    const people = await sql`SELECT * FROM person_metrics ORDER BY risk_score DESC LIMIT 4`;
    res.json({ workspace, repos, people });
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
    const tech = await sql`SELECT * FROM technology_metrics ORDER BY usage_percent DESC`;
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
const PERSON_RISK_HIGH_THRESHOLD = 70;       // risk_score >= this triggers warning finding
const REPO_RISK_HIGH_THRESHOLD = 80;         // risk_score >= this triggers warning finding

export async function getFindings(req: Request, res: Response) {
    try {
        const findings: Finding[] = [];

        // 1. Bus factor critical: repos where bus_factor <= 1
        const fragileRepos = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count
            FROM repo_metrics
            WHERE bus_factor <= ${BUS_FACTOR_CRITICAL_THRESHOLD}
        `;

        // For each fragile repo, find the top contributor via Neo4j
        // Uses the same Cypher pattern as calculateBusFactor in repoMetrics.service.ts
        if (fragileRepos.length > 0) {
            const session = driver.session();
            try {
                for (const repo of fragileRepos) {
                    let topContributor = 'a single contributor';
                    try {
                        const result = await session.run(
                            `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r {name: $repoName})
                             RETURN p.name AS person, count(c) AS commits
                             ORDER BY commits DESC
                             LIMIT 1`,
                            { repoName: repo.repo_name }
                        );
                        if (result.records.length > 0) {
                            topContributor = result.records[0]?.get('person') || topContributor;
                        }
                    } catch (cyErr: any) {
                        console.warn(`[Findings] Neo4j top-contributor query failed for ${repo.repo_name}:`, cyErr?.message);
                    }

                    findings.push({
                        severity: 'critical',
                        title: 'Bus factor critical',
                        description: `${repo.repo_name} depends entirely on ${topContributor} (bus factor: ${repo.bus_factor}, risk: ${repo.risk_score}%)`,
                        relatedEntity: repo.repo_name,
                        relatedEntityType: 'repo',
                    });
                }
            } finally {
                await session.close();
            }
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

        // 3. Repo risk score high: risk_score >= 80 (fragile status)
        const highRiskRepos = await sql`
            SELECT repo_name, risk_score, bus_factor, contributor_count
            FROM repo_metrics
            WHERE risk_score >= ${REPO_RISK_HIGH_THRESHOLD}
              AND bus_factor > ${BUS_FACTOR_CRITICAL_THRESHOLD}
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

        // Look up person_name from person_metrics by external_id
        const [person] = await sql`
            SELECT person_name, external_id, risk_score, top_technologies, repos, commit_count
            FROM person_metrics
            WHERE external_id = ${externalId}
        `;

        if (!person) {
            return res.status(404).json({ error: `Person with externalId "${externalId}" not found in person_metrics` });
        }

        // Call calculateKnowledgeRisk directly — no LLM agent pipeline
        const riskResult = await calculateKnowledgeRisk(person.person_name);

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
        });
    } catch (error: any) {
        console.error('[SimulateDeparture] Error:', error?.message);
        res.status(500).json({ error: 'Failed to simulate departure', message: error?.message });
    }
}