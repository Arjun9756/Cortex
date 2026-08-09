export function buildKnowledgeRiskPrompt(labels: string[], relations: string[]): string {
    return `
You are mapping abstract knowledge-risk concepts to the ACTUAL relation types and entity labels that exist in a graph database.

## AVAILABLE RELATION TYPES IN THE GRAPH:
${relations.join(", ")}

## AVAILABLE ENTITY LABELS IN THE GRAPH:
${labels.join(", ")}

For each concept below, pick the BEST MATCHING relation type and target entity label from the lists above. If nothing matches well, use null.

Concepts:
- "ownership": a person creating/authoring work (e.g. commits, PRs, issues)
- "dependency": other things depending on what this person created
- "activity": recent work by this person (commits, PRs, reviews in last 90 days)
- "documentation": a person authoring documentation/readme files
- "expertise": single-maintainer / sole-contributor codebase items authored or maintained by this person
- "pendingWork": work items assigned to a person that are still open (e.g. issues, PRs)

Return ONLY JSON:
{
  "ownership": { "relation": "string or null", "targetLabel": "string or null" },
  "dependency": { "relation": "string or null", "targetLabel": "string or null" },
  "activity": { "relation": "string or null", "targetLabel": "string or null" },
  "documentation": { "relation": "string or null", "targetLabel": "string or null" },
  "expertise": { "relation": "string or null", "targetLabel": "string or null" },
  "pendingWork": { "relation": "string or null", "targetLabel": "string or null" }
}

Examples based on typical graph schemas:
- ownership → { "relation": "AUTHORED", "targetLabel": "COMMIT" }
- dependency → { "relation": "DEPENDS_ON", "targetLabel": null }
- activity → { "relation": "AUTHORED", "targetLabel": "COMMIT" }
- documentation → { "relation": "AUTHORED", "targetLabel": "FILE" }
- expertise → { "relation": "AUTHORED", "targetLabel": "COMMIT" }
- pendingWork → { "relation": "ASSIGNED_TO", "targetLabel": "ISSUE" }
`.trim();
}