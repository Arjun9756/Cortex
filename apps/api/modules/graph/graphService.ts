import sql from '../../config/postgres.js';
import { driver } from '../../config/neo4j.js';
import { RISK_THRESHOLDS } from '../../../../packages/shared/riskThresholds.js';
import { DISPLAYABLE_SOURCES } from '../../../../packages/database/provenance.js';
export interface GraphSummaryFilters {
    repository?: string;
    personExternalId?: string;
    limit?: number;
}
export interface SummaryNode {
    id: string;
    name: string;
    type: 'REPOSITORY' | 'PERSON' | 'TECHNOLOGY';
    label: string;
    color: string;
    glowColor: string;
    radius: number;
    status?: string;
    bus_factor?: number;
    risk_score?: number;
    primary_owner?: string | null;
    contributor_count?: number;
    commit_count?: number;
    usage_percent?: number;
    externalId?: string | null;
    canonical_id?: string;
    [key: string]: any;
}
export interface SummaryEdge {
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
}
export interface GraphSummaryResponse {
    status: boolean;
    cached: boolean;
    generated_at: string;
    nodeCount: number;
    edgeCount: number;
    nodes: SummaryNode[];
    edges: SummaryEdge[];
}
async function runNeo4jSafe<T>(task: () => Promise<T>, timeoutMs: number = 1500, fallback: T): Promise<T> {
    try {
        const timeoutPromise = new Promise<T>((_, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout after ' + timeoutMs+ 'ms')), timeoutMs);
            if (timer && typeof timer.unref === 'function') timer.unref();
        });
        return await Promise.race([task(), timeoutPromise]);
    } catch (err: any) {
        console.warn('[GraphService] Neo4j safe fallback: ' + err?.message);
        return fallback;
    }
}
function getRepoVisuals(status: string | undefined, riskScore: number, contributorCount: number) {
    const isFragile = status === 'fragile' || riskScore >= 80;
    const isConcentrated = status === 'concentrated' || (riskScore > 50 && riskScore < 80);
    const isEmpty = status === 'empty' || (!status && contributorCount === 0);
    let color = '#10B981';
    let glowColor = 'rgba(16, 185, 129, 0.45)';
    if (isEmpty) {
        color = '#64748B';
        glowColor = 'rgba(100, 116, 139, 0.35)';
    } else if (isFragile) {
        color = '#EF4444';
        glowColor = 'rgba(239, 68, 68, 0.45)';
    } else if (isConcentrated) {
        color = '#F59E0B';
        glowColor = 'rgba(245, 158, 11, 0.45)';
    }
    const radius = Math.max(12, Math.min(22, 12 + Math.sqrt(contributorCount || 0) * 3));
    return { color, glowColor, radius };
}
function getPersonVisuals(riskScore: number, commitCount: number) {
    let color = '#10B981';
    let glowColor = 'rgba(16, 185, 129, 0.45)';
    if (riskScore >= 70) {
        color = '#F43F5E';
        glowColor = 'rgba(244, 63, 94, 0.45)';
    } else if (riskScore >= 40) {
        color = '#F59E0B';
        glowColor = 'rgba(245, 158, 11, 0.45)';
    }
    const radius = Math.max(11, Math.min(20, 11 + Math.sqrt(commitCount || 0) * 2));
    return { color, glowColor, radius };
}
function getTechVisuals(repoCount: number) {
    const color = '#A855F7';
    const glowColor = 'rgba(168, 85, 247, 0.45)';
    const radius = Math.max(9, Math.min(16, 9 + Math.sqrt(repoCount || 0) * 2));
    return { color, glowColor, radius };
}
export async function buildGraphSummary(filters: GraphSummaryFilters = {}): Promise<Omit<GraphSummaryResponse, 'cached'> & { cached: boolean }> {
    const maxLimit = Math.min(filters.limit || 120, 200);
    // 1. Fetch precomputed metrics in parallel from Postgres
    const [reposRaw, peopleRaw, techRaw] = await Promise.all([
        sql`SELECT external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status, computed_at FROM repo_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} ORDER BY risk_score DESC LIMIT 60`,
        sql`SELECT external_id, person_name, risk_score, top_technologies, repos, commit_count, computed_at FROM person_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} ORDER BY commit_count DESC, risk_score DESC LIMIT 60`,
        sql`SELECT tech_name, usage_percent, trend_percent, repo_count, contributor_count, top_experts, computed_at FROM technology_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} ORDER BY repo_count DESC, usage_percent DESC LIMIT 40`,
    ]);
    const nodeMap = new Map<string, SummaryNode>();
    const edges: SummaryEdge[] = [];
    const edgeKeySet = new Set<string>();
    function addEdge(source: string, target: string, type: string, label: string) {
        if (!source || !target || source === target) return;
        const key = source + '->' + target + ':' + type;
        if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            edges.push({ id: key, source, target, type, label });
        }
    }
    // 2. Build Repository Nodes
    for (const r of reposRaw) {
        const id = r.external_id || r.repo_name;
        if (!id) continue;
        const visuals = getRepoVisuals(r.status, r.risk_score || 0, r.contributor_count || 0);
        nodeMap.set(id, {
            id,
            name: r.repo_name,
            type: 'REPOSITORY',
            label: 'REPOSITORY',
            status: r.status || 'healthy',
            bus_factor: Number(r.bus_factor || 0),
            risk_score: r.risk_score || 0,
            primary_owner: r.primary_owner || null,
            contributor_count: r.contributor_count || 0,
            color: visuals.color,
            glowColor: visuals.glowColor,
            radius: visuals.radius,
        });
        if (r.repo_name && r.repo_name !== id && !nodeMap.has(r.repo_name)) {
            nodeMap.set(r.repo_name, nodeMap.get(id)!);
        }
    }
    // 3. Build Person Nodes & Edges from Precomputed Metrics
    const personNameMap = new Map<string, string>(); // name -> id for owner matching
    for (const p of peopleRaw) {
        const id = p.external_id;
        if (!id) continue;
        personNameMap.set(p.person_name.toLowerCase(), id);
        const visuals = getPersonVisuals(p.risk_score || 0, p.commit_count || 0);
        nodeMap.set(id, {
            id,
            name: p.person_name,
            type: 'PERSON',
            label: 'PERSON',
            externalId: id,
            canonical_id: id,
            risk_score: p.risk_score || 0,
            commit_count: p.commit_count || 0,
            repos: p.repos || [],
            top_technologies: p.top_technologies || [],
            color: visuals.color,
            glowColor: visuals.glowColor,
            radius: visuals.radius,
        });
        // Connect Person -> Repos (WORKS_ON)
        if (Array.isArray(p.repos)) {
            for (const repoName of p.repos) {
                if (typeof repoName === 'string' && repoName.trim()) {
                    addEdge(id, repoName.trim(), 'WORKS_ON', 'WORKS_ON');
                }
            }
        }
        // Connect Person -> Tech (USES)
        if (Array.isArray(p.top_technologies)) {
            for (const item of p.top_technologies) {
                const techName = typeof item === 'string' ? item : item?.name;
                if (techName && typeof techName === 'string' && techName.trim()) {
                    addEdge(id, techName.trim(), 'USES', 'USES');
                }
            }
        }
    }
    // 4. Build Technology Nodes
    for (const t of techRaw) {
        const id = t.tech_name;
        if (!id) continue;
        const visuals = getTechVisuals(t.repo_count || 0);
        nodeMap.set(id, {
            id,
            name: t.tech_name,
            type: 'TECHNOLOGY',
            label: 'TECHNOLOGY',
            usage_percent: Number(t.usage_percent || 0),
            trend_percent: Number(t.trend_percent || 0),
            repo_count: t.repo_count || 0,
            contributor_count: t.contributor_count || 0,
            color: visuals.color,
            glowColor: visuals.glowColor,
            radius: visuals.radius,
        });
        // Connect Tech -> Top Experts (EXPERT_IN)
        if (Array.isArray(t.top_experts)) {
            for (const expert of t.top_experts) {
                const expertName = expert?.name;
                if (expertName && personNameMap.has(expertName.toLowerCase())) {
                    const personId = personNameMap.get(expertName.toLowerCase())!;
                    addEdge(personId, id, 'USES', 'USES');
                }
            }
        }
    }
    // 5. Connect Primary Owners to Repositories
    for (const r of reposRaw) {
        const repoId = r.external_id || r.repo_name;
        if (r.primary_owner && repoId) {
            const ownerKey = r.primary_owner.toLowerCase();
            const personId = personNameMap.get(ownerKey);
            if (personId) {
                addEdge(personId, repoId, 'AUTHORED', 'PRIMARY_OWNER');
            }
        }
    }
    // 6. Light Neo4j lookup for Repo -> Tech dependencies (with safe timeout fallback)
    await runNeo4jSafe(async () => {
        const session = driver.session();
        try {
            const res = await session.run(
                'MATCH (r:REPOSITORY)-[:DEPENDS_ON|USES|MENTIONED_IN]-(t:TECHNOLOGY) ' +
                'RETURN DISTINCT r.name AS repo, t.name AS tech LIMIT 120'
            );
            for (const rec of res.records) {
                const repo = rec.get('repo');
                const tech = rec.get('tech');
                if (repo && tech) {
                    addEdge(repo, tech, 'DEPENDS_ON', 'DEPENDS_ON');
                }
            }
        } finally {
            await session.close();
        }
    }, 3000, undefined);
    // 7. Filtering & Node Capping
    let allNodes = Array.from(new Set(nodeMap.values()));
    let filteredEdges = edges;
    if (filters.repository) {
        const targetRepo = filters.repository.trim().toLowerCase();
        const connectedNodeIds = new Set<string>();
        for (const n of allNodes) {
            if (n.type === 'REPOSITORY' && (n.name.toLowerCase() === targetRepo ||
n.id.toLowerCase() === targetRepo)) {
                connectedNodeIds.add(n.id);
                connectedNodeIds.add(n.name);
            }
        }
        filteredEdges = edges.filter(e => {
            if (connectedNodeIds.has(e.source) || connectedNodeIds.has(e.target)) {
                connectedNodeIds.add(e.source);
                connectedNodeIds.add(e.target);
                return true;
            }
            return false;
        });
        allNodes = allNodes.filter(n => connectedNodeIds.has(n.id) || connectedNodeIds.has(n.name));
    } else if (filters.personExternalId) {
        const targetPerson = filters.personExternalId.trim();
        const connectedNodeIds = new Set<string>([targetPerson]);
        filteredEdges = edges.filter(e => {
            if (connectedNodeIds.has(e.source) || connectedNodeIds.has(e.target)) {
                connectedNodeIds.add(e.source);
                connectedNodeIds.add(e.target);
                return true;
            }
            return false;
        });
        allNodes = allNodes.filter(n => connectedNodeIds.has(n.id) || connectedNodeIds.has(n.name));
    }
    if (allNodes.length > maxLimit) {
        allNodes.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        allNodes = allNodes.slice(0, maxLimit);
        const retainedIds = new Set(allNodes.map(n => n.id).concat(allNodes.map(n => n.name)));
        filteredEdges = filteredEdges.filter(e => retainedIds.has(e.source) && retainedIds.has(e.target));
    }
    const finalNodeIds = new Set(allNodes.map(n => n.id).concat(allNodes.map(n => n.name)));
    const validEdges = filteredEdges.filter(e => finalNodeIds.has(e.source) && finalNodeIds.has(e.target));
    return {
        status: true,
        cached: false,
        generated_at: new Date().toISOString(),
        nodeCount: allNodes.length,
        edgeCount: validEdges.length,
        nodes: allNodes,
        edges: validEdges,
    };
}

export async function getGraphTopologyMetrics(): Promise<{
    totalNodes: number;
    totalEdges: number;
    repoCount: number;
    personCount: number;
    techCount: number;
}> {
    const summary = await buildGraphSummary({ limit: 120 });
    let repoCount = 0;
    let personCount = 0;
    let techCount = 0;
    for (const n of summary.nodes) {
        if (n.type === 'REPOSITORY') repoCount++;
        else if (n.type === 'PERSON') personCount++;
        else if (n.type === 'TECHNOLOGY') techCount++;
    }
    return {
        totalNodes: summary.nodeCount,
        totalEdges: summary.edgeCount,
        repoCount,
        personCount,
        techCount
    };
}

export async function buildNodeDetail(id: string, requestedType?: string): Promise<any> {
    const cleanId = (id || '').trim();
    const type = (requestedType || '').toLowerCase();
    if (type === 'repository' || type === 'repo') return resolveRepoDetail(cleanId);
    if (type === 'person' || type === 'user' || cleanId.startsWith('person_') || cleanId.startsWith('canonical_')) return resolvePersonDetail(cleanId);
    if (type === 'technology' || type === 'tech') return resolveTechDetail(cleanId);

    const repoMatch = await sql`SELECT external_id FROM repo_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND (external_id = ${cleanId} OR repo_name = ${cleanId}) LIMIT 1`;
    if (repoMatch.length > 0) return resolveRepoDetail(cleanId);
    const personMatch = await sql`SELECT external_id FROM person_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND (external_id = ${cleanId} OR person_name ILIKE ${cleanId}) LIMIT 1`;
    if (personMatch.length > 0) return resolvePersonDetail(cleanId);
    return resolveTechDetail(cleanId);
}

async function resolveRepoDetail(identifier: string) {
    const rows = await sql`SELECT external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status, computed_at FROM repo_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND (external_id = ${identifier} OR repo_name = ${identifier}) LIMIT 1`;
    if (rows.length === 0) {
        return {
            id: identifier,
            name: identifier,
            type: 'REPOSITORY',
            status: 'empty',
            bus_factor: 0,
            risk_score: 0,
            primary_owner: null,
            contributor_count: 0,
            top_contributors: [],
            related_technologies: [],
            neighbors: [],
            actions: {
                inspect_risk: { type: 'route', target: 'bus-factor', label: 'Inspect Risk', params: { repo: identifier } },
                simulate_impact: { type: 'action', target: 'simulate_impact', label: 'Simulate Impact' }
            },
            generated_at: new Date().toISOString(),
            cached: false
        };
    }

    const repo = rows[0]!;
    const repoName = repo.repo_name;

    if (repo.status === 'empty' || Number(repo.bus_factor) === 0 || Number(repo.contributor_count) === 0) {
        return {
            id: repo.external_id || repoName,
            name: repoName,
            type: 'REPOSITORY',
            status: 'empty',
            bus_factor: 0,
            risk_score: 0,
            primary_owner: null,
            contributor_count: 0,
            top_contributors: [],
            related_technologies: [],
            neighbors: [],
            computed_at: repo.computed_at,
            actions: {
                inspect_risk: { type: 'route', target: 'bus-factor', label: 'Inspect Risk', params: { repo: repoName } },
                simulate_impact: { type: 'action', target: 'simulate_impact', label: 'Simulate Impact' }
            },
            generated_at: new Date().toISOString(),
            cached: false
        };
    }

    const contributorsRaw = await sql`SELECT external_id, person_name, risk_score, commit_count, top_technologies FROM person_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND repos::jsonb ? ${repoName} ORDER BY commit_count DESC LIMIT 8`;
    const topContributors = contributorsRaw.map(c => ({
        id: c.external_id,
        name: c.person_name,
        risk_score: c.risk_score,
        commit_count: c.commit_count,
    }));

    const techSet = new Set<string>();
    contributorsRaw.forEach(c => {
        if (Array.isArray(c.top_technologies)) {
            c.top_technologies.forEach((t: any) => {
                const name = typeof t === 'string' ? t : t?.name;
                if (name) techSet.add(name);
            });
        }
    });

    await runNeo4jSafe(async () => {
        const session = driver.session();
        try {
            const res = await session.run(`
                MATCH (r:REPOSITORY)-[:USES|DEPENDS_ON]->(t:TECHNOLOGY)
                WHERE lower(r.name) = lower($repoName)
                RETURN t.name AS name LIMIT 10
            `, { repoName });
            res.records.forEach(rec => {
                const n = rec.get('name');
                if (n) techSet.add(n);
            });
        } finally {
            await session.close();
        }
    }, 1000, undefined);

    const relatedTechnologies = Array.from(techSet).slice(0, 10);
    const neighbors = [
        ...topContributors.map(c => ({ id: c.id, name: c.name, type: 'PERSON', relation: 'CONTRIBUTOR' })),
        ...relatedTechnologies.map(t => ({ id: t, name: t, type: 'TECHNOLOGY', relation: 'DEPENDS_ON' }))
    ];

    return {
        id: repo.external_id || repoName,
        name: repoName,
        type: 'REPOSITORY',
        status: repo.status || 'healthy',
        bus_factor: Number(repo.bus_factor || 0),
        risk_score: repo.risk_score || 0,
        primary_owner: repo.primary_owner || null,
        contributor_count: repo.contributor_count || topContributors.length,
        top_contributors: topContributors,
        related_technologies: relatedTechnologies,
        neighbors,
        computed_at: repo.computed_at,
        actions: {
            inspect_risk: { type: 'route', target: 'bus-factor', label: 'Inspect Risk', params: { repo: repoName } },
            simulate_impact: { type: 'action', target: 'simulate_impact', label: 'Simulate Impact' }
        },
        generated_at: new Date().toISOString(),
        cached: false
    };
}

async function resolvePersonDetail(identifier: string) {
    const rows = await sql`SELECT external_id, person_name, risk_score, top_technologies, repos, commit_count, computed_at FROM person_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND (external_id = ${identifier} OR person_name ILIKE ${identifier}) LIMIT 1`;
    if (rows.length === 0) {
        return {
            id: identifier,
            name: identifier,
            type: 'PERSON',
            risk_score: 0,
            risk_tier: 'Low',
            commit_count: 0,
            repos: [],
            top_technologies: [],
            neighbors: [],
            actions: {
                simulate_departure: { type: 'route', target: 'people', label: 'Simulate Departure', params: { person: identifier } }
            },
            generated_at: new Date().toISOString(),
            cached: false
        };
    }

    const person = rows[0]!;
    const canonicalId = person.external_id || identifier;
    const personRepos: string[] = Array.isArray(person.repos) ? person.repos : [];

    let repoRisks: any[] = [];
    if (personRepos.length > 0) {
        repoRisks = await sql`SELECT repo_name, status, risk_score, bus_factor FROM repo_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND repo_name = ANY(${personRepos})`;
    }
    const repoRiskMap = new Map(repoRisks.map(r => [r.repo_name, r]));

    const enrichedRepos = personRepos.map(name => {
        const m = repoRiskMap.get(name);
        return {
            name,
            status: m ? m.status : 'healthy',
            risk_score: m ? m.risk_score : 0,
            bus_factor: m ? Number(m.bus_factor) : 1
        };
    });

    const identities = await sql`SELECT provider, external_id, username, email, display_name FROM person_identity WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND canonical_person_id = ${canonicalId}`;

    const riskScore = person.risk_score || 0;
    const riskTier = riskScore >= RISK_THRESHOLDS.CRITICAL ? 'Critical' : riskScore >= RISK_THRESHOLDS.HIGH ? 'High' : riskScore >= RISK_THRESHOLDS.MODERATE ? 'Moderate' : 'Low';

    const neighbors = [
        ...enrichedRepos.map(r => ({ id: r.name, name: r.name, type: 'REPOSITORY', relation: 'WORKS_ON' })),
        ...(Array.isArray(person.top_technologies) ? person.top_technologies.map((t: any) => ({
            id: typeof t === 'string' ? t : t.name,
            name: typeof t === 'string' ? t : t.name,
            type: 'TECHNOLOGY',
            relation: 'PROFICIENT_IN'
        })) : [])
    ];

    return {
        id: canonicalId,
        canonical_id: canonicalId,
        name: person.person_name,
        type: 'PERSON',
        risk_score: riskScore,
        risk_tier: riskTier,
        commit_count: person.commit_count || 0,
        repos: enrichedRepos,
        top_technologies: person.top_technologies || [],
        identities,
        neighbors,
        computed_at: person.computed_at,
        actions: {
            simulate_departure: { type: 'route', target: 'people', label: 'Simulate Departure', params: { person: canonicalId } }
        },
        generated_at: new Date().toISOString(),
        cached: false
    };
}

async function resolveTechDetail(identifier: string) {
    const rows = await sql`SELECT tech_name, usage_percent, trend_percent, repo_count, contributor_count, commit_count, pr_count, issue_count, top_experts, computed_at FROM technology_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND tech_name ILIKE ${identifier} LIMIT 1`;
    if (rows.length === 0) {
        return {
            id: identifier,
            name: identifier,
            type: 'TECHNOLOGY',
            usage_percent: 0,
            trend_percent: 0,
            repo_count: 0,
            contributor_count: 0,
            commit_count: 0,
            top_experts: [],
            related_repos: [],
            neighbors: [],
            actions: {
                explore_tech: { type: 'route', target: 'technologies', label: 'Explore Technology', params: { tech: identifier } }
            },
            generated_at: new Date().toISOString(),
            cached: false
        };
    }

    const tech = rows[0]!;
    const techName = tech.tech_name;
    const likePattern = '%' + techName + '%';
    const relatedReposRaw = await sql`SELECT DISTINCT jsonb_array_elements_text(repos) AS repo FROM person_metrics WHERE source IN ${sql([...DISPLAYABLE_SOURCES])} AND top_technologies::text ILIKE ${likePattern} LIMIT 8`;
    const relatedRepos = relatedReposRaw.map(r => r.repo).filter(Boolean);
    const topExperts = Array.isArray(tech.top_experts) ? tech.top_experts : [];

    const neighbors = [
        ...topExperts.map((e: any) => ({ id: e.name, name: e.name, type: 'PERSON', relation: 'EXPERT' })),
        ...relatedRepos.map(r => ({ id: r, name: r, type: 'REPOSITORY', relation: 'USED_IN' }))
    ];

    return {
        id: techName,
        name: techName,
        type: 'TECHNOLOGY',
        usage_percent: Number(tech.usage_percent || 0),
        trend_percent: Number(tech.trend_percent || 0),
        repo_count: tech.repo_count || relatedRepos.length,
        contributor_count: tech.contributor_count || topExperts.length,
        commit_count: tech.commit_count || 0,
        top_experts: topExperts,
        related_repos: relatedRepos,
        neighbors,
        computed_at: tech.computed_at,
        actions: {
            explore_tech: { type: 'route', target: 'technologies', label: 'Explore Technology', params: { tech: techName } }
        },
        generated_at: new Date().toISOString(),
        cached: false
    };
}
