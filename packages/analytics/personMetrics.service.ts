import { driver } from "../../apps/api/config/neo4j.js";
import { calculateKnowledgeRisk } from "./knowledge.service.js";
import sql from "../../apps/api/config/postgres.js";

/**
 * Migration note: person_metrics table must have these columns for this service to work:
 *
 *   external_id VARCHAR(255) UNIQUE NOT NULL
 *
 * If the table was created before this constraint existed, run:
 *   ALTER TABLE person_metrics ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
 *   CREATE UNIQUE INDEX IF NOT EXISTS person_metrics_external_id_idx ON person_metrics (external_id);
 *
 * risk_score is stored as a 0–100 INTEGER (percentage).
 * calculateKnowledgeRisk returns totalRisk on 0–1 scale → multiply by 100 before storing.
 */
export async function calculateAllPersonMetrics() {
    const session = driver.session();
    try {
        const persons = await session.run(
            `MATCH (p:PERSON) RETURN p.name AS name, p.externalId AS externalId`
        );

        for (const record of persons.records) {
            const personName = record.get("name");
            const externalId = record.get("externalId");

            if (!externalId) {
                console.warn(`[PersonMetrics] Skipping person without externalId: ${personName}`);
                continue;
            }

            // Bug #6 fix: per-record try/catch so one bad record doesn't abort the whole batch
            try {
                const risk = await calculateKnowledgeRisk(personName);

                const repoResult = await session.run(
                    `MATCH (p {name: $name})-[]-(e)-[:PART_OF]->(r:REPOSITORY)
                     RETURN DISTINCT r.name AS repo`,
                    { name: personName }
                );
                const repos = repoResult.records.map((r: any) => r.get("repo"));

                const techResult = await session.run(
                    `MATCH (p {name: $name})-[]-(e)-[:MENTIONED_IN|USES]-(t:TECHNOLOGY)
                     RETURN t.name AS tech, count(*) AS score ORDER BY score DESC LIMIT 5`,
                    { name: personName }
                );
                const topTechnologies = techResult.records.map((r: any) => ({
                    name: r.get("tech"),
                    score: r.get("score")?.toNumber() ?? 0,
                }));

                const commitResult = await session.run(
                    `MATCH (p {name: $name})-[:AUTHORED]->(c:COMMIT) RETURN count(c) AS count`,
                    { name: personName }
                );
                const commitCount = commitResult.records[0]?.get("count")?.toNumber() ?? 0;

                // Bug #1 fix: risk.totalRisk is 0–1; multiply by 100 to store as 0–100 percentage.
                // Old code used * 10 (0–10), inconsistent with repoMetrics which stores 0–100.
                const riskScore = Math.round(risk.totalRisk * 100);

                await sql`
                    INSERT INTO person_metrics
                        (external_id, person_name, risk_score, top_technologies, repos, commit_count, computed_at)
                    VALUES
                        (${externalId}, ${personName}, ${riskScore}, ${sql.json(topTechnologies)},
                         ${sql.json(repos)}, ${commitCount}, now())
                    ON CONFLICT (external_id)
                    DO UPDATE SET
                        person_name      = EXCLUDED.person_name,
                        risk_score       = EXCLUDED.risk_score,
                        top_technologies = EXCLUDED.top_technologies,
                        repos            = EXCLUDED.repos,
                        commit_count     = EXCLUDED.commit_count,
                        computed_at      = EXCLUDED.computed_at
                `;

                console.log(`[PersonMetrics] ${personName} (${externalId}): risk=${riskScore}`);
            } catch (personError: any) {
                console.error(`[PersonMetrics] Failed for ${personName}: ${personError?.message}`);
                // Continue to next person — don't let one failure abort the whole batch
            }
        }

        console.log("=== Person Metrics Computed ===");
    } catch (error: any) {
        console.error(`[PersonMetrics] Fatal error: ${error?.message}`);
    } finally {
        await session.close();
    }
}