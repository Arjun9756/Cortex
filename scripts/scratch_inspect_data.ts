import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const ghostRows = await sql`
        SELECT person_name, external_id 
        FROM person_metrics 
        WHERE person_name ILIKE '%17900%' OR person_name ILIKE '%pilot%'
    `;
    console.log('Ghost Persons in person_metrics:', ghostRows);

    const ghostIdentities = await sql`
        SELECT display_name, canonical_person_id, provider, external_id, username, email
        FROM person_identity
        WHERE display_name ILIKE '%17900%' OR display_name ILIKE '%pilot%' OR username ILIKE '%17900%' OR canonical_person_id ILIKE '%17900%'
    `;
    console.log('Ghost Identities in person_identity:', ghostIdentities);

    const realPeopleRows = await sql`
        SELECT person_name, external_id, risk_score, repos, commit_count 
        FROM person_metrics 
        WHERE NOT (person_name ILIKE '%17900%' OR person_name ILIKE '%pilot%' OR person_name ILIKE '%test%')
        ORDER BY commit_count DESC
        LIMIT 5
    `;
    console.log('Sample Real People:', realPeopleRows);

    const realReposRows = await sql`
        SELECT repo_name, bus_factor, risk_score, primary_owner, status 
        FROM repo_metrics 
        WHERE NOT (repo_name ILIKE '%17900%' OR repo_name ILIKE '%pilot%' OR repo_name ILIKE '%test%')
        ORDER BY bus_factor DESC
        LIMIT 5
    `;
    console.log('Sample Real Repos:', realReposRows);

    await driver.close();
    process.exit(0);
}

main();
