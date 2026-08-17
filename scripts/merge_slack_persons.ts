import { driver } from '../apps/api/config/neo4j.js';

interface SlackMergeMapping {
    slackId: string;
    canonicalName: string;
    email: string;
}

const SLACK_MERGE_MAPPINGS: SlackMergeMapping[] = [
    { slackId: "U555PRIYA1",  canonicalName: "Priya Sharma", email: "priya.sharma@nexora.io" },
    { slackId: "U111NEHA5",   canonicalName: "Neha Gupta",   email: "neha.gupta@company.com" },
    { slackId: "U222AMIT6",   canonicalName: "Amit Shah",    email: "amit.shah@company.com" },
    { slackId: "U777ROHAN2",  canonicalName: "Rohan Verma",  email: "rohan.verma@company.com" },
    { slackId: "U888SARAH3",  canonicalName: "Sarah Chen",   email: "sarah.chen@company.com" },
    { slackId: "U999VIKRAM4", canonicalName: "Vikram Patel", email: "vikram.patel@company.com" },
];

async function mergeSlackPersonEntities() {
    const session = driver.session();
    try {
        console.log("================================================================================");
        console.log("🔄 MERGING RAW SLACK USER ID NODES INTO CANONICAL VERIFIED PERSON NODES");
        console.log("================================================================================\n");

        for (const mapping of SLACK_MERGE_MAPPINGS) {
            console.log(`Processing merge: "${mapping.slackId}" ➔ "${mapping.canonicalName}" (${mapping.email})...`);

            const result = await session.run(`
                MATCH (raw:PERSON)
                WHERE raw.name = $slackId OR raw.externalId = $slackId
                MATCH (canonical:PERSON)
                WHERE (canonical.name = $canonicalName OR canonical.email = $email)
                  AND elementId(raw) <> elementId(canonical)

                // 1. Transfer Outgoing Relationships from raw to canonical
                WITH raw, canonical
                OPTIONAL MATCH (raw)-[r_out]->(target)
                WHERE target IS NOT NULL AND elementId(target) <> elementId(canonical)
                FOREACH (_ IN CASE WHEN r_out IS NOT NULL AND type(r_out) = 'AUTHORED' THEN [1] ELSE [] END |
                    MERGE (canonical)-[:AUTHORED]->(target)
                )
                FOREACH (_ IN CASE WHEN r_out IS NOT NULL AND type(r_out) = 'CREATED' THEN [1] ELSE [] END |
                    MERGE (canonical)-[:CREATED]->(target)
                )
                FOREACH (_ IN CASE WHEN r_out IS NOT NULL AND type(r_out) = 'WORKS_ON' THEN [1] ELSE [] END |
                    MERGE (canonical)-[:WORKS_ON]->(target)
                )
                FOREACH (_ IN CASE WHEN r_out IS NOT NULL AND type(r_out) = 'USES' THEN [1] ELSE [] END |
                    MERGE (canonical)-[:USES]->(target)
                )
                FOREACH (_ IN CASE WHEN r_out IS NOT NULL AND type(r_out) = 'CONTRIBUTED_TO' THEN [1] ELSE [] END |
                    MERGE (canonical)-[:CONTRIBUTED_TO]->(target)
                )

                // 2. Transfer Incoming Relationships to canonical
                WITH raw, canonical
                OPTIONAL MATCH (source)-[r_in]->(raw)
                WHERE source IS NOT NULL AND elementId(source) <> elementId(canonical)
                FOREACH (_ IN CASE WHEN r_in IS NOT NULL AND type(r_in) = 'FIXED_BY' THEN [1] ELSE [] END |
                    MERGE (source)-[:FIXED_BY]->(canonical)
                )
                FOREACH (_ IN CASE WHEN r_in IS NOT NULL AND type(r_in) = 'ASSIGNED_TO' THEN [1] ELSE [] END |
                    MERGE (source)-[:ASSIGNED_TO]->(canonical)
                )

                // 3. Update canonical node properties
                SET canonical.slackId = $slackId,
                    canonical.externalId = coalesce(canonical.externalId, $slackId),
                    canonical.isVerified = true,
                    canonical.provenance = 'structured_author'

                // 4. Delete the raw Slack ID node
                DETACH DELETE raw

                RETURN count(canonical) AS mergedCount
            `, {
                slackId: mapping.slackId,
                canonicalName: mapping.canonicalName,
                email: mapping.email,
            });

            const merged = result.records[0]?.get('mergedCount')?.toNumber?.() ?? Number(result.records[0]?.get('mergedCount') || 0);
            console.log(`  ✅ Merged and updated ${merged} canonical node for ${mapping.slackId} ➔ ${mapping.canonicalName}.`);
        }

        console.log("\n================================================================================");
        console.log("🎉 SLACK USER ENTITY MERGE COMPLETE!");
        console.log("================================================================================\n");

    } catch (e: any) {
        console.error("Merge error:", e.message);
    } finally {
        await session.close();
    }
}

mergeSlackPersonEntities().catch(console.error);
