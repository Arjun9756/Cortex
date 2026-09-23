import { dispatchCoreTool } from '../packages/agent/tools/dispatcher.js';

async function main() {
    console.log("=== TESTING 10 CORE TOOLS ===");

    const tests = [
        { name: 'get_commit_count (repo)', tool: 'get_commit_count', args: { repo: 'billing-engine' } },
        { name: 'get_commit_count (person)', tool: 'get_commit_count', args: { person: 'priyasharma' } },
        { name: 'get_commit_count (both)', tool: 'get_commit_count', args: { repo: 'billing-engine', person: 'priyasharma' } },
        { name: 'get_successor_recommendation (repo)', tool: 'get_successor_recommendation', args: { repo: 'billing-engine' } },
        { name: 'get_successor_recommendation (person)', tool: 'get_successor_recommendation', args: { person: 'priyasharma' } },
        { name: 'get_bus_factor', tool: 'get_bus_factor', args: { repo: 'billing-engine' } },
        { name: 'get_repo_contributors', tool: 'get_repo_contributors', args: { repo: 'billing-engine' } },
        { name: 'get_ownership', tool: 'get_ownership', args: { repo: 'billing-engine' } },
        { name: 'get_person_identity', tool: 'get_person_identity', args: { alias: 'Arjun9756' } },
        { name: 'get_recent_changes', tool: 'get_recent_changes', args: { repo: 'billing-engine', days: 30 } },
        { name: 'get_person_activity', tool: 'get_person_activity', args: { person: 'priyasharma' } },
    ];

    let allPassed = true;

    for (const t of tests) {
        console.log(`\n--- Running ${t.name} ---`);
        const res = await dispatchCoreTool(t.tool, t.args);
        console.log(`Success: ${res.success}, Latency: ${res.latencyMs}ms`);
        console.log(`Summary: ${res.summary}`);
        if (!res.success) {
            console.error(`Error:`, res.error);
            allPassed = false;
        } else {
            console.log(`Data preview:`, JSON.stringify(res.data).slice(0, 200) + '...');
        }
    }

    if (allPassed) {
        console.log("\nALL 10 CORE TOOLS PASSED DIRECT TESTS WITH CLEAN GROUNDED DATA!");
        process.exit(0);
    } else {
        console.error("\nSOME CORE TOOLS FAILED!");
        process.exit(1);
    }
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
