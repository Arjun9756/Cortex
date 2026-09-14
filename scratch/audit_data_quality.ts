import sql from '../apps/api/config/postgres.js';

async function main() {
    console.log('\n=== AUDIT: PEOPLE DATA (person_metrics) ===');
    const people = await sql`SELECT person_name, external_id, risk_score, repos, commit_count, top_technologies FROM person_metrics ORDER BY risk_score DESC`;
    console.log(`Total people in person_metrics: ${people.length}`);
    for (const p of people) {
        const repos = Array.isArray(p.repos) ? p.repos : [];
        const techs = Array.isArray(p.top_technologies) ? p.top_technologies.length : 0;
        console.log(`  ${p.person_name} | risk=${p.risk_score}% | repos=[${repos.join(', ')}] | commits=${p.commit_count} | techs=${techs} | ext=${p.external_id}`);
    }

    console.log('\n=== AUDIT: REPO DATA (repo_metrics) ===');
    const repos = await sql`SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status FROM repo_metrics ORDER BY bus_factor ASC`;
    console.log(`Total repos in repo_metrics: ${repos.length}`);
    for (const r of repos) {
        console.log(`  ${r.repo_name} | bus_factor=${r.bus_factor} | risk=${r.risk_score}% | contributors=${r.contributor_count} | owner=${r.primary_owner} | status=${r.status}`);
    }

    console.log('\n=== AUDIT: IDENTITY DATA (person_identity) ===');
    const identities = await sql`SELECT canonical_person_id, provider, external_id, username, email, display_name FROM person_identity ORDER BY canonical_person_id`;
    console.log(`Total identities: ${identities.length}`);
    const canonicalGroups = new Map<string, any[]>();
    for (const id of identities) {
        const group = canonicalGroups.get(id.canonical_person_id) || [];
        group.push(id);
        canonicalGroups.set(id.canonical_person_id, group);
    }
    for (const [canonId, group] of canonicalGroups) {
        console.log(`\n  Canonical Person: ${canonId}`);
        for (const id of group) {
            console.log(`    [${id.provider}] display="${id.display_name}" user="${id.username}" email="${id.email}" ext="${id.external_id}"`);
        }
    }

    console.log('\n=== AUDIT: TECHNOLOGY DATA (technology_metrics) ===');
    const techs = await sql`SELECT tech_name, usage_percent, contributor_count, repo_count FROM technology_metrics ORDER BY usage_percent DESC`;
    console.log(`Total technologies: ${techs.length}`);
    for (const t of techs) {
        const warning = Number(t.contributor_count) === 1 ? ' ⚠️ SINGLE EXPERT!' : '';
        console.log(`  ${t.tech_name} | usage=${t.usage_percent}% | contributors=${t.contributor_count} | repos=${t.repo_count}${warning}`);
    }

    console.log('\n=== AUDIT: WORKSPACE METRICS ===');
    const [ws] = await sql`SELECT * FROM workspace_metrics ORDER BY computed_at DESC LIMIT 1`;
    if (ws) {
        console.log(`  knowledge_risk_avg=${ws.knowledge_risk_avg} | bus_factor_avg=${ws.bus_factor_avg} | repo_count=${ws.repo_count} | contributor_count=${ws.contributor_count}`);
    } else {
        console.log('  NO WORKSPACE METRICS FOUND');
    }

    console.log('\n=== AUDIT: DUPLICATE PERSON NAMES CHECK ===');
    const dupes = await sql`
        SELECT person_name, COUNT(*) as cnt 
        FROM person_metrics 
        GROUP BY person_name 
        HAVING COUNT(*) > 1
    `;
    if (dupes.length > 0) {
        console.log('  ⚠️ DUPLICATE PERSON NAMES FOUND:');
        for (const d of dupes) {
            console.log(`    "${d.person_name}" appears ${d.cnt} times!`);
        }
    } else {
        console.log('  ✅ No duplicate person names found in person_metrics');
    }

    console.log('\n=== AUDIT: ZERO-REPO PEOPLE CHECK ===');
    const zeroRepo = people.filter((p: any) => {
        const repos = Array.isArray(p.repos) ? p.repos : [];
        return repos.length === 0;
    });
    if (zeroRepo.length > 0) {
        console.log(`  ⚠️ ${zeroRepo.length} people with ZERO repos:`);
        for (const p of zeroRepo) {
            console.log(`    "${p.person_name}" risk=${p.risk_score}% commits=${p.commit_count}`);
        }
    } else {
        console.log('  ✅ All people have at least 1 repo');
    }

    console.log('\n=== AUDIT: ZERO-COMMIT REPOS CHECK ===');
    const zeroCommit = repos.filter((r: any) => Number(r.bus_factor) === 0);
    if (zeroCommit.length > 0) {
        console.log(`  ⚠️ ${zeroCommit.length} repos with bus_factor=0 (empty/scaffold):`);
        for (const r of zeroCommit) {
            console.log(`    "${r.repo_name}" risk=${r.risk_score}% contributors=${r.contributor_count}`);
        }
    } else {
        console.log('  ✅ No repos with bus_factor=0');
    }
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
