import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        console.log('Inspecting path for Amina Zahra:');
        const res2 = await s.run(`
            MATCH (p:PERSON)-[r1]-(w)-[r2]-(t:TECHNOLOGY)
            WHERE toLower(p.name) CONTAINS 'amina'
            RETURN labels(w)[0] AS wLabel, type(r1) AS r1, type(r2) AS r2, t.name AS tech,
                   startNode(r1) = p AS pStart1, startNode(r2) = w AS wStart2
        `);
        console.table(res2.records.map(r => ({
            w: r.get('wLabel'),
            r1: r.get('r1'),
            r2: r.get('r2'),
            tech: r.get('tech'),
            pStart1: r.get('pStart1'),
            wStart2: r.get('wStart2')
        })));

        console.log('Inspecting path for Amina Zahra and graphql:');
        const res3 = await s.run(`
            MATCH (p:PERSON)-[r1]-(w)-[r2]-(t:TECHNOLOGY)
            WHERE p.name = 'Amina Zahra' AND toLower(t.name) CONTAINS 'graphql'
            RETURN labels(p), type(r1), labels(w), type(r2), labels(t),
                   startNode(r1) = p AS pIsStartR1,
                   startNode(r2) = w AS wIsStartR2
        `);
        console.table(res2.records.map(r => ({
            r1: r.get('type(r1)'),
            w: r.get('labels(w)')[0],
            r2: r.get('type(r2)'),
            pIsStartR1: r.get('pIsStartR1'),
            wIsStartR2: r.get('wIsStartR2')
        })));
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
