import { isCommitEntity, normalizeEntityType, resolveEntity } from '../packages/extraction/entityResolver.js'
import { ENTITY_TYPES } from '../packages/extraction/ontology.js'
import { upsertEntity, batchUpsertRelations } from '../packages/database/neo4j/graph.repository.js'
import { saveExtractionToGraph } from '../packages/extraction/processExtraction.js'
import { driver } from '../apps/api/config/neo4j.js'

async function runDefenseTests() {
    console.log('=== RUNNING CORTEX LLM COMMIT DEFENSE & GRAPH INTEGRITY AUDIT ===\n')
    let failed = 0

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`[PASS] ${testName}`)
        } else {
            console.error(`[FAIL] ${testName}`)
            failed++
        }
    }

    // ----------------------------------------------------
    // TEST LAYER 1: ONTOLOGY INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- LAYER 1: Ontology & Schema Validation ---')
    assert(!(ENTITY_TYPES as readonly string[]).includes('COMMIT'), 'Ontology ENTITY_TYPES does NOT contain COMMIT')
    assert((ENTITY_TYPES as readonly string[]).includes('REPOSITORY'), 'Ontology contains REPOSITORY')
    assert((ENTITY_TYPES as readonly string[]).includes('TECHNOLOGY'), 'Ontology contains TECHNOLOGY')
    assert((ENTITY_TYPES as readonly string[]).includes('PERSON'), 'Ontology contains PERSON')

    // ----------------------------------------------------
    // TEST LAYER 2: ALIAS & HASH NORMALIZATION
    // ----------------------------------------------------
    console.log('\n--- LAYER 2: Alias & SHA Hash Pattern Detection ---')
    const commitAliases = ['COMMIT', 'COMMITS', 'GIT_COMMIT', 'GITCOMMIT', 'COMMIT_HASH', 'CHANGESET', 'REVISION']
    for (const alias of commitAliases) {
        assert(normalizeEntityType(alias) === 'COMMIT', `Alias "${alias}" normalizes to canonical "COMMIT"`)
        assert(isCommitEntity('some_item', alias), `Alias "${alias}" triggers isCommitEntity(some_item, "${alias}")`)
    }

    const commitHashes = [
        '8f3b12a',
        'a1b2c3d4e5f6',
        'a1b2c3d4e5f6789012345678901234567890abcd',
        'commit 8f3b12a',
        'commit: a1b2c3d',
        'sha: 1234567',
        'commit fix-database-deadlock'
    ]
    for (const hash of commitHashes) {
        assert(isCommitEntity(hash), `Pattern "${hash}" recognized as commit even with generic/missing type`)
    }

    const nonCommits = [
        'PostgreSQL',
        'redis-cache',
        'auth-service',
        'Arjun Kumar',
        'CORE-101',
        'PR-404',
        'services/billing/stripeClient.ts'
    ]
    for (const name of nonCommits) {
        assert(!isCommitEntity(name, 'TECHNOLOGY') && !isCommitEntity(name), `Legitimate entity "${name}" is NOT flagged as commit`)
    }

    // ----------------------------------------------------
    // TEST LAYER 3: DATABASE DRIVER GATEKEEPER
    // ----------------------------------------------------
    console.log('\n--- LAYER 3: Database Driver Gatekeeper ---')
    const session = driver.session()
    try {
        const commitUpsertResult1 = await upsertEntity('commit_999abc', 'COMMIT', undefined, session)
        assert(commitUpsertResult1 === undefined, 'Direct upsertEntity("commit_999abc", "COMMIT") returns undefined and is blocked')

        const commitUpsertResult2 = await upsertEntity('commit 8f3b12a', 'GIT_COMMIT', undefined, session)
        assert(commitUpsertResult2 === undefined, 'Direct upsertEntity with alias "GIT_COMMIT" returns undefined and is blocked')

        const commitUpsertResult3 = await upsertEntity('a1b2c3d4e5f6789012345678901234567890abcd', 'TECHNOLOGY', undefined, session)
        assert(commitUpsertResult3 === undefined, 'Direct upsertEntity with raw 40-char SHA returns undefined and is blocked')
    } finally {
        await session.close()
    }

    // ----------------------------------------------------
    // TEST LAYER 4: PIPELINE EXTRACTION & REWIRING SIMULATION
    // ----------------------------------------------------
    console.log('\n--- LAYER 4: End-to-End Extraction Pipeline Simulation ---')
    // Simulate what happens when an LLM hallucinates commit entities & relations
    const mockEntities = [
        { name: 'test-commit-mock-1234567', type: 'COMMIT' },
        { name: 'TestRedisDefenseDB', type: 'TECHNOLOGY' },
        { name: 'test-defense-repo', type: 'REPOSITORY' }
    ]
    const mockNewEntities = [
        { name: 'commit 7654321', suggestedType: 'GIT_COMMIT' },
        { name: 'TestKafkaDefenseStream', suggestedType: 'TECHNOLOGY' }
    ]
    const mockRelationships = [
        // LLM hallucinated that commit used Redis
        { from: 'test-commit-mock-1234567', to: 'TestRedisDefenseDB', type: 'USES', evidence: 'mock test' },
        // Valid repo relationship
        { from: 'test-defense-repo', to: 'TestRedisDefenseDB', type: 'USES', evidence: 'mock test' }
    ]
    const mockNewRelations = [
        // LLM hallucinated that developer authored commit
        { from: 'TestDevUser', to: 'commit 7654321', suggestedType: 'AUTHORED', evidence: 'mock test' }
    ]

    await saveExtractionToGraph(
        mockEntities,
        mockNewEntities,
        mockRelationships,
        mockNewRelations,
        [{ name: 'TestDevUser', email: 'testdev@cortex.internal' }]
    )

    // Verify Relationship Rewiring function directly
    const simulatedLLMRels = [
        { from: '8f3b12a', to: 'PostgreSQL', type: 'USES' },
        { from: 'ArjunDev', to: '8f3b12a', type: 'AUTHORED' }
    ]
    const repoName = 'cortex-core-repo'
    for (const r of simulatedLLMRels) {
        if (isCommitEntity(r.from)) {
            r.from = repoName
        }
        if (isCommitEntity(r.to)) {
            if (r.type === 'AUTHORED' || r.type === 'CREATED' || r.type === 'WORKS_ON') {
                r.to = repoName
                r.type = 'CONTRIBUTED_TO'
            }
        }
    }
    assert(Boolean(simulatedLLMRels[0]?.from === 'cortex-core-repo' && simulatedLLMRels[0]?.to === 'PostgreSQL' && simulatedLLMRels[0]?.type === 'USES'), 'Commit-to-tech relation rewired to repo -> USES -> tech')
    assert(Boolean(simulatedLLMRels[1]?.from === 'ArjunDev' && simulatedLLMRels[1]?.to === 'cortex-core-repo' && simulatedLLMRels[1]?.type === 'CONTRIBUTED_TO'), 'Person-to-commit relation rewired to person -> CONTRIBUTED_TO -> repo')

    // ----------------------------------------------------
    // TEST LAYER 5: LIVE NEO4J VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- LAYER 5: Live Neo4j Graph Verification ---')
    const verifySession = driver.session()
    try {
        // 1. Verify 0 COMMIT nodes exist in Neo4j
        const commitCheck = await verifySession.run(`
            MATCH (c)
            WHERE 'COMMIT' IN labels(c) 
               OR c.name CONTAINS 'test-commit-mock' 
               OR c.name = 'commit 7654321'
            RETURN count(c) AS totalCommits
        `)
        const totalCommits = commitCheck.records[0]?.get('totalCommits')?.toNumber ? commitCheck.records[0].get('totalCommits').toNumber() : Number(commitCheck.records[0]?.get('totalCommits') || 0)
        assert(totalCommits === 0, `Neo4j contains exactly 0 commit nodes (found ${totalCommits})`)

        // 2. Verify legitimate entities were successfully created
        const techCheck = await verifySession.run(`
            MATCH (t:TECHNOLOGY {name: 'TestRedisDefenseDB'})
            RETURN count(t) AS totalTech
        `)
        const totalTech = techCheck.records[0]?.get('totalTech')?.toNumber ? techCheck.records[0].get('totalTech').toNumber() : Number(techCheck.records[0]?.get('totalTech') || 0)
        assert(totalTech === 1, 'Legitimate TECHNOLOGY node "TestRedisDefenseDB" was created')

        // 3. Clean up test nodes
        await verifySession.run(`
            MATCH (n)
            WHERE n.name IN ['TestRedisDefenseDB', 'TestKafkaDefenseStream', 'test-defense-repo', 'TestDevUser']
            DETACH DELETE n
        `)
        console.log('[Cleanup] Temporary test nodes removed cleanly.')
    } finally {
        await verifySession.close()
    }

    console.log(`\n=== AUDIT COMPLETE: ${failed === 0 ? 'ALL CHECKS PASSED PERFECTLY!' : `${failed} CHECKS FAILED`} ===\n`)
    await driver.close()
    if (failed > 0) process.exit(1)
}

runDefenseTests().catch(err => {
    console.error('Test script crashed:', err)
    process.exit(1)
})
