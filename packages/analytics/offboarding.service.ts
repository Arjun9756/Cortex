import { driver } from '../../apps/api/config/neo4j.js';
import sql from '../../apps/api/config/postgres.js';
import neo4j from 'neo4j-driver';
import { calculateKnowledgeRisk } from './knowledge.service.js';
import { createGroqChatCompletion } from '../llm/providers/groq.js';

export interface OffboardingHandoffOutput {
    person: string;
    ownedRepositories: Array<{ name: string; busFactor: number; isSPOF: boolean }>;
    ownedTechnologies: string[];
    openIssues: Array<{ title: string; externalId?: string }>;
    pendingPRs: Array<{ title: string; externalId?: string }>;
    knowledgeRiskScore: number;
    suggestedReplacementEngineers: Array<{ name: string; similarityScore: number; sharedTechCount: number }>;
    missingDocumentation: Array<{ component: string; issue: string }>;
    estimatedRecoveryTimeWeeks: number;
    summaryMarkdown: string;
}

/**
 * PHASE 2: Offboarding Handoff Generator
 * 100% Deterministic Neo4j + Postgres calculation for offboarding data.
 * LLM used ONLY for final Markdown summary formatting.
 */
export async function generateOffboardingHandoff(personName: string): Promise<OffboardingHandoffOutput> {
    const session = driver.session();
    try {
        // 1. Owned Repositories & SPOF check
        const reposRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED|WORKS_ON]->(w)-[:PART_OF|BELONGS_TO]->(r:REPOSITORY)
            WHERE toLower(p.name) CONTAINS toLower($name)
            RETURN DISTINCT r.name AS repo
        `, { name: personName });

        const repoNames = reposRes.records.map(r => r.get('repo'));
        const ownedRepositories: OffboardingHandoffOutput['ownedRepositories'] = [];

        for (const repo of repoNames) {
            const [metrics] = await sql`
                SELECT bus_factor FROM repo_metrics WHERE repo_name ILIKE ${`%${repo}%`} LIMIT 1
            `;
            const busFactor = metrics?.bus_factor ?? 1;
            ownedRepositories.push({
                name: repo,
                busFactor,
                isSPOF: busFactor <= 1
            });
        }

        // 2. Owned Technologies
        const techRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED|WORKS_ON]->(w)-[:USES|MENTIONED_IN]-(t:TECHNOLOGY)
            WHERE toLower(p.name) CONTAINS toLower($name)
            RETURN DISTINCT t.name AS tech
            LIMIT 15
        `, { name: personName });
        const ownedTechnologies = techRes.records.map(r => r.get('tech'));

        // 3. Open Issues & Pending PRs from Graph / Events SQL
        const issuesRes = await session.run(`
            MATCH (p:PERSON)-[:ASSIGNED_TO|AUTHORED]-(i:ISSUE)
            WHERE toLower(p.name) CONTAINS toLower($name)
            RETURN DISTINCT i.name AS title, i.externalId AS externalId
            LIMIT 10
        `, { name: personName });
        const openIssues = issuesRes.records.map(r => ({
            title: r.get('title'),
            externalId: r.get('externalId') || undefined
        }));

        const prsRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED]-(pr:PULL_REQUEST)
            WHERE toLower(p.name) CONTAINS toLower($name)
            RETURN DISTINCT pr.name AS title, pr.externalId AS externalId
            LIMIT 10
        `, { name: personName });
        const pendingPRs = prsRes.records.map(r => ({
            title: r.get('title'),
            externalId: r.get('externalId') || undefined
        }));

        // 4. Knowledge Risk Calculation
        let knowledgeRiskScore = 50;
        try {
            const risk = await calculateKnowledgeRisk(personName);
            knowledgeRiskScore = Math.round(risk.totalRisk * 100);
        } catch (err: any) {
            console.warn(`[Offboarding] Knowledge risk calculation fallback: ${err?.message}`);
        }

        // 5. Successor Candidates via Skill & Tech Jaccard Similarity Graph Traversal
        const successorRes = await session.run(`
            MATCH (target:PERSON) WHERE toLower(target.name) CONTAINS toLower($name)
            MATCH (other:PERSON) WHERE NOT toLower(other.name) CONTAINS toLower($name)
            MATCH (target)-[:AUTHORED|WORKS_ON]->()-[:USES|MENTIONED_IN]-(t:TECHNOLOGY)
            MATCH (other)-[:AUTHORED|WORKS_ON]->()-[:USES|MENTIONED_IN]-(t)
            RETURN other.name AS candidate, count(DISTINCT t) AS sharedTech
            ORDER BY sharedTech DESC
            LIMIT 5
        `, { name: personName });

        const targetTechCount = Math.max(1, ownedTechnologies.length);
        const suggestedReplacementEngineers: OffboardingHandoffOutput['suggestedReplacementEngineers'] = successorRes.records.map(r => {
            const sharedTech = neo4j.integer.toNumber(r.get('sharedTech'));
            const similarityScore = Math.min(0.99, Math.round((sharedTech / targetTechCount) * 100) / 100);
            return {
                name: r.get('candidate'),
                similarityScore,
                sharedTechCount: sharedTech
            };
        });

        // 6. Missing Documentation & Estimated Recovery Time Weeks
        const missingDocumentation = ownedRepositories
            .filter(r => r.isSPOF)
            .map(r => ({
                component: r.name,
                issue: `Bus Factor ${r.busFactor} (SPOF) — Missing owner documentation.`
            }));

        const spofCount = ownedRepositories.filter(r => r.isSPOF).length;
        const estimatedRecoveryTimeWeeks = Math.max(2, Math.round(2 + spofCount * 2.5 + (ownedTechnologies.length > 5 ? 2 : 0)));

        // 7. LLM Summary Markdown Formatting ONLY
        let summaryMarkdown = '';
        try {
            const summaryPrompt = `
Generate a clean, structured Markdown Handoff Playbook for offboarding "${personName}".

DATA DETECTED:
- Owned Repositories: ${JSON.stringify(ownedRepositories)}
- Owned Technologies: ${JSON.stringify(ownedTechnologies)}
- Knowledge Risk Score: ${knowledgeRiskScore}%
- Open Issues: ${openIssues.length}, Pending PRs: ${pendingPRs.length}
- Successor Candidates: ${JSON.stringify(suggestedReplacementEngineers)}
- Estimated Recovery Time: ${estimatedRecoveryTimeWeeks} weeks

Format with clear headers: # Executive Summary, ## Owned Repositories & SPOFs, ## Recommended Successors, ## Recovery Plan.
`;
            const llmRes = await createGroqChatCompletion({
                messages: [{ role: 'user', content: summaryPrompt }],
                temperature: 0.2,
                max_completion_tokens: 1024
            });
            summaryMarkdown = llmRes.choices[0]?.message?.content || 'Handoff summary generated.';
        } catch (llmErr: any) {
            summaryMarkdown = `# Offboarding Handoff Playbook: ${personName}\n\n- Knowledge Risk: ${knowledgeRiskScore}%\n- Estimated Recovery: ${estimatedRecoveryTimeWeeks} weeks\n- SPOF Repositories: ${ownedRepositories.map(r => r.name).join(', ') || 'None'}`;
        }

        return {
            person: personName,
            ownedRepositories,
            ownedTechnologies,
            openIssues,
            pendingPRs,
            knowledgeRiskScore,
            suggestedReplacementEngineers,
            missingDocumentation,
            estimatedRecoveryTimeWeeks,
            summaryMarkdown
        };

    } finally {
        await session.close();
    }
}
