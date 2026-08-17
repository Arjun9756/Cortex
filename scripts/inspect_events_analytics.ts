import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
  const count = await sql`SELECT count(*) FROM events`;
  const providers = await sql`SELECT provider, count(*) FROM events GROUP BY provider`;
  const dates = await sql`SELECT min(created_at), max(created_at) FROM events`;
  const eventTypes = await sql`SELECT event_type, count(*) FROM events GROUP BY event_type`;
  
  const weekly = await sql`
    SELECT 
      date_trunc('week', created_at) AS week_start,
      count(*)::int AS count,
      count(*) FILTER (WHERE event_type ILIKE '%commit%' OR event_type ILIKE '%push%')::int AS commits,
      count(*) FILTER (WHERE event_type ILIKE '%pull%' OR event_type ILIKE '%pr%')::int AS prs,
      count(*) FILTER (WHERE event_type ILIKE '%issue%')::int AS issues
    FROM events
    GROUP BY 1
    ORDER BY week_start ASC
  `;

  const session = driver.session();
  let nodeCounts: any = {};
  try {
    const nr = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
    `);
    const er = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) AS type, count(r) AS count
    `);
    nodeCounts = {
      nodes: nr.records.map(r => ({ label: r.get('label'), count: r.get('count').toNumber() })),
      edges: er.records.map(r => ({ type: r.get('type'), count: r.get('count').toNumber() })),
    };
  } finally {
    await session.close();
  }

  console.log('=== EVENTS SUMMARY ===');
  console.log({ count, providers, dates, eventTypes, weekly });
  console.log('=== NEO4J GRAPH COUNTS ===');
  console.log(JSON.stringify(nodeCounts, null, 2));

  process.exit(0);
}

main().catch(console.error);
