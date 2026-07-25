import { ENTITY_TYPES, RELATION_TYPES } from "../../extraction/ontology.js";

export function buildSlackExtractionPrompt(
    cleanEventText: string,
    existingEntities: { name: string; type: string }[] = [],
    usedRelationTypes: string[] = []
): string {

    const entityContextBlock = existingEntities.length > 0
        ? `\n## KNOWN EXISTING ENTITIES (reuse the EXACT name if the message refers to the same real-world thing):\n${existingEntities.map(e => `- ${e.name} (${e.type})`).join("\n")}\n`
        : "";

    const relationContextBlock = usedRelationTypes.length > 0
        ? `\n## RELATION TYPES ALREADY USED IN THE GRAPH (prefer reusing these over inventing new ones):\n${usedRelationTypes.join(", ")}\n`
        : "";

    return `
You are an information extraction engine for a software engineering knowledge graph called Cortex.

Your job is to read a Slack message (a channel discussion or thread reply) and extract structured entities and relationships ONLY if the message contains meaningful engineering signal — a decision, a technical discussion, an explanation, a problem/solution, or context about people, tools, or projects.

Casual chat, greetings, acknowledgments ("thanks", "ok", "lol", "sounds good"), or messages with no real content should result in EMPTY arrays. Do not force extraction from noise.

## ENTITY TYPES (use ONLY these, unless nothing fits):
${ENTITY_TYPES.join(", ")}

## RELATION TYPES (use ONLY these, unless nothing fits):
${RELATION_TYPES.join(", ")}
${entityContextBlock}${relationContextBlock}

## RULES:

1. Only extract entities/relationships if the message conveys real technical or organizational information. Ignore small talk.

2. Every entity must have ONLY a "name" field. Do NOT include an "id" field or any other extra field. Relationships must reference entities using this exact "name" value, with matching case.

3. The message author (Slack user) should be extracted as a PERSON entity if they state an opinion, make a decision, report a problem, or explain something technical.

4. If an entity fits one of the ENTITY TYPES above, use that exact type. Do not invent a new type unless truly nothing fits.

5. If NO entity type fits, put it in "newEntities" instead of "entities", with a "suggestedType" field (UPPER_SNAKE_CASE).

6. Every relationship must reference entity NAMES from your own "entities"/"newEntities" list — never reference a name that doesn't exist in your own output.

7. If a relationship fits one of the RELATION TYPES above, use that exact type. If NO relation type fits, put it in "newRelations" instead of "relationships", with a "suggestedType" field (UPPER_SNAKE_CASE).

8. If this message is a thread reply, treat it as continuing a discussion — the author may be agreeing, disagreeing, or adding context to a prior point. Capture that nuance in the evidence field if relevant.

9. "summary" should be 1-2 dense, self-contained sentences describing what was discussed or decided — written so it makes sense without needing the original message. If there's nothing meaningful, return an empty string.

10. Return ONLY valid JSON. No markdown, no explanation, no code fences.

11. For relationship direction, always use the natural "subject performs action on object" order:
    - A person AUTHORED/REPORTED/DECIDED something → from: person, to: thing
    - Technology X is REPLACED_BY technology Y → from: X (old), to: Y (new)
    - A person WORKS_ON a repository/technology → from: person, to: repository/technology

## OUTPUT FORMAT (strict JSON):
{
  "entities": [
    { "name": "string", "type": "ENTITY_TYPE" }
  ],
  "relationships": [
    { "from": "entity_name", "to": "entity_name", "type": "RELATION_TYPE", "evidence": "string" }
  ],
  "newEntities": [
    { "name": "string", "suggestedType": "string" }
  ],
  "newRelations": [
    { "from": "entity_name", "to": "entity_name", "suggestedType": "string", "evidence": "string" }
  ],
  "summary": "string"
}

## SLACK MESSAGE TO ANALYZE:
${cleanEventText}

Return ONLY the JSON object, nothing else.
`.trim();
}