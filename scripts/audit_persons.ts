import { driver } from '../apps/api/config/neo4j.js';
import neo4j from 'neo4j-driver';

async function auditPersonNodes() {
    const session = driver.session();
    try {
        console.log("================================================================================");
        console.log("🔍 AUDITING NEO4J GRAPH FOR ALL PERSON NODES");
        console.log("================================================================================\n");

        const result = await session.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[r]->(target)
            OPTIONAL MATCH (source)-[r_in]->(p)
            RETURN p.name AS name,
                   p.email AS email,
                   p.role AS role,
                   p.externalId AS externalId,
                   p.isVerified AS isVerified,
                   p.provenance AS provenance,
                   count(DISTINCT r) + count(DISTINCT r_in) AS totalRelations,
                   collect(DISTINCT type(r))[0..5] AS outRelations,
                   collect(DISTINCT type(r_in))[0..5] AS inRelations
            ORDER BY p.name
        `);

        console.log(`Found ${result.records.length} PERSON node(s) in Neo4j:\n`);
        const rows = result.records.map(rec => {
            const rels = rec.get('totalRelations');
            const relCount = neo4j.integer.toNumber(rels);
            const hasEmail = Boolean(rec.get('email'));
            const hasRole = Boolean(rec.get('role'));
            const isVerified = rec.get('isVerified') ?? (hasEmail || hasRole);

            return {
                name: rec.get('name'),
                email: rec.get('email') || '(none)',
                role: rec.get('role') || '(none)',
                relations: relCount,
                verified: isVerified ? 'YES (Structured)' : 'NO (Free-text)',
                outRelations: (rec.get('outRelations') || []).join(', ') || '(none)',
                inRelations: (rec.get('inRelations') || []).join(', ') || '(none)',
            };
        });

        console.table(rows);

        const verifiedCount = rows.filter(r => r.verified.startsWith('YES')).length;
        const unverifiedCount = rows.length - verifiedCount;
        console.log(`\n📊 AUDIT SUMMARY:`);
        console.log(`- Total PERSON nodes: ${rows.length}`);
        console.log(`- Structured / Verified Human Entities: ${verifiedCount}`);
        console.log(`- Unverified Free-Text Entities: ${unverifiedCount}`);
        console.log("================================================================================\n");

    } catch (e: any) {
        console.error("Audit error:", e.message);
    } finally {
        await session.close();
    }
}

auditPersonNodes().catch(console.error);
