import { ENTITY_TYPES, RELATION_TYPES } from "../../extraction/ontology.js";

export function buildGithubExtractionPrompt(cleanEventText: string): string {
    return `
You are an information extraction engine for a software engineering knowledge graph called Cortex.

Your job is to read an event (a GitHub commit, pull request, issue, or comment) and extract structured entities and relationships from it.

## ENTITY TYPES (use ONLY these, unless nothing fits):
${ENTITY_TYPES.join(", ")}

## RELATION TYPES (use ONLY these, unless nothing fits):
${RELATION_TYPES.join(", ")}

## RULES:

1. Only extract entities that are explicitly present or clearly implied in the text. Do NOT invent information.

2. Every entity must have ONLY a "name" field (the real-world name — e.g. "Arjun", "cortex-repo", "redis"). Do NOT include an "id" field or any other extra field. Relationships must reference entities using this exact "name" value, with matching case.

3. If an entity fits one of the ENTITY TYPES above, use that exact type. Do not invent a new type unless truly nothing fits.

4. If NO entity type fits, put it in "newEntities" instead of "entities", with a "suggestedType" field (UPPER_SNAKE_CASE).

5. Every relationship must reference entity NAMES from your own "entities"/"newEntities" list — never reference a name that doesn't exist in your own output.

6. If a relationship fits one of the RELATION TYPES above, use that exact type. If NO relation type fits, put it in "newRelations" instead of "relationships", with a "suggestedType" field (UPPER_SNAKE_CASE).

7. "summary" should be 1-2 sentences, plain English, describing what happened in this event. This will be embedded for semantic search, so make it information-dense and self-contained (don't say "this commit" — say what actually happened).

8. If the text has no meaningful entities or relationships, return empty arrays. Do not force extraction.

9. Return ONLY valid JSON. No markdown, no explanation, no code fences.

10. For relationship direction, always use the natural "subject performs action on object" order:
    - A person AUTHORED a commit → from: person, to: commit (NOT commit → person)
    - A commit is PART_OF a repository → from: commit, to: repository
    - A person WORKS_ON a repository → from: person, to: repository
    - Technology X is REPLACED_BY technology Y → from: X (old), to: Y (new)

11. If the event data includes "totalFilesChanged" that is significantly larger than the number of files listed in "filesChanged", 
do NOT try to create a FILE entity for every file. Instead, mention the scale of the change in the summary (e.g., "a bulk change affecting 200 files"), and only extract files that seem architecturally 
significant (e.g., config files, schema files, core modules) from the ones provided.

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

## EVENT TO ANALYZE:
${cleanEventText}

Return ONLY the JSON object, nothing else.
`.trim();
}