import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import neo4j from 'neo4j-driver';

interface PersonGraphProfile {
    name: string;
    technologies: Set<string>;
    repositories: Set<string>;
    latestActivityTimestamp: number | null;
    spofReposCount: number;
    knowledgeRisk: number; // 0 - 1
}

function parseNeo4jTimestamp(raw: any): number | null {
    if (!raw) return null;
    if (neo4j.isInt(raw)) return raw.toNumber();
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const num = Number(raw);
        if (!isNaN(num) && num > 1000000) return num;
        const parsed = new Date(raw).getTime();
        if (!isNaN(parsed)) return parsed;
    }
    if (raw.low !== undefined && raw.high !== undefined) {
        return neo4j.integer.toNumber(raw);
    }
    return null;
}

async function getPersonProfile(session: any, personName: string): Promise<PersonGraphProfile | null> {
    try {
        // 1. Resolve Person
        const pRes = await session.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) CONTAINS toLower($name)
               OR (p.email IS NOT NULL AND toLower(p.email) CONTAINS toLower($name))
            RETURN p.name AS name
            LIMIT 1
        `, { name: personName });

        if (pRes.records.length === 0) return null;
        const name = pRes.records[0].get('name');

        // 2. Technologies (direct USES, or through AUTHORED/CREATED/WORKS_ON/ASSIGNED_TO/CONTRIBUTED_TO work items)
        const techRes = await session.run(`
            MATCH (p:PERSON {name: $name})
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON|ASSIGNED_TO|CONTRIBUTED_TO]-(w)-[:USES|MENTIONED_IN]-(t2:TECHNOLOGY)
            RETURN collect(DISTINCT toLower(t1.name)) + collect(DISTINCT toLower(t2.name)) AS techs
        `, { name });
        const rawTechs: string[] = techRes.records[0]?.get('techs') || [];
        const technologies = new Set<string>(rawTechs.filter(Boolean));

        // 3. Repositories (direct WORKS_ON/CONTRIBUTED_TO or through commits/PRs/issues)
        const repoRes = await session.run(`
            MATCH (p:PERSON {name: $name})
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(w)-[:PART_OF|BELONGS_TO]-(r2:REPOSITORY)
            RETURN collect(DISTINCT toLower(r1.name)) + collect(DISTINCT toLower(r2.name)) AS repos
        `, { name });
        const rawRepos: string[] = repoRes.records[0]?.get('repos') || [];
        const repositories = new Set<string>(rawRepos.filter(Boolean));

        // 4. Latest Activity Timestamp from Neo4j
        const actRes = await session.run(`
            MATCH (p:PERSON {name: $name})-[:AUTHORED|CREATED|WORKS_ON]-(w)
            WHERE w.timestamp IS NOT NULL OR w.createdAt IS NOT NULL OR w.created_at IS NOT NULL
            RETURN max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
        `, { name });
        let latestActivityTimestamp: number | null = null;
        const rawTime = actRes.records[0]?.get('latestTime');
        if (rawTime) {
            latestActivityTimestamp = parseNeo4jTimestamp(rawTime);
        }

        // 5. Existing Knowledge Risk Score (0-1) and SPOF repo count
        let knowledgeRisk = 0.2; // default
        try {
            const pm = await sql`
                SELECT risk_score, repos, top_technologies 
                FROM person_metrics 
                WHERE person_name ILIKE ${name} 
                ORDER BY computed_at DESC 
                LIMIT 1
            `;
            if (pm.length > 0) {
                if (pm[0].risk_score != null) {
                    knowledgeRisk = Number(pm[0].risk_score) / 100;
                }
                if (Array.isArray(pm[0].repos)) {
                    pm[0].repos.forEach((r: string) => repositories.add(r.toLowerCase()));
                }
                if (Array.isArray(pm[0].top_technologies)) {
                    pm[0].top_technologies.forEach((t: any) => {
                        const tName = typeof t === 'string' ? t : (t.name || t.tech);
                        if (tName) technologies.add(tName.toLowerCase());
                    });
                }
            }
        } catch (e: any) {
            console.log('Postgres pm error for', name, e.message);
        }

        let spofReposCount = 0;
        try {
            for (const repo of repositories) {
                const rm = await sql`
                    SELECT bus_factor FROM repo_metrics WHERE repo_name ILIKE ${repo} LIMIT 1
                `;
                if (rm.length > 0 && Number(rm[0].bus_factor) <= 1) {
                    spofReposCount++;
                }
            }
        } catch (e: any) {
            console.log('Postgres rm error for', name, e.message);
        }

        return {
            name,
            technologies,
            repositories,
            latestActivityTimestamp,
            spofReposCount,
            knowledgeRisk
        };
    } catch (err: any) {
        console.error(`Error building profile for ${personName}:`, err.message);
        return null;
    }
}

async function testAll() {
    const session = driver.session();
    try {
        const allPersonsRes = await session.run(`MATCH (p:PERSON) RETURN p.name AS name ORDER BY p.name`);
        const allNames: string[] = allPersonsRes.records.map(r => r.get('name'));

        console.log(`Found ${allNames.length} persons in graph:`, allNames);

        const profiles: PersonGraphProfile[] = [];
        for (const name of allNames) {
            const prof = await getPersonProfile(session, name);
            if (prof) profiles.push(prof);
        }

        console.log('\n================ PROFILES ===============');
        for (const p of profiles) {
            console.log(`\nPerson: ${p.name}`);
            console.log(`- Technologies (${p.technologies.size}):`, Array.from(p.technologies).join(', '));
            console.log(`- Repositories (${p.repositories.size}):`, Array.from(p.repositories).join(', '));
            console.log(`- Latest Activity:`, p.latestActivityTimestamp ? new Date(p.latestActivityTimestamp).toISOString() : 'None');
            console.log(`- Knowledge Risk:`, Math.round(p.knowledgeRisk * 100) + '%', `(SPOF repos: ${p.spofReposCount})`);
        }

    } finally {
        await session.close();
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

testAll();
