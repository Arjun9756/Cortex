import { upsertRelation, upsertEntity } from "../database/neo4j/graph.repository.js"

type ExtractedEntity = {
    name: string,
    type: string
}

type NewEntities = {
    name: string,
    suggestedType: string
}

/**
 * Normalizes entity type aliases so LLM label variations (e.g. USER, DEVELOPER, AUTHOR)
 * are cleanly mapped to standardized canonical node labels (PERSON, REPOSITORY, PULL_REQUEST, ISSUE).
 */
export function normalizeEntityType(type: string): string {
    if (!type) return 'ENTITY';
    const upper = type.trim().toUpperCase();
    if (['USER', 'DEVELOPER', 'CONTRIBUTOR', 'AUTHOR', 'MEMBER', 'ENGINEER', 'PERSON'].includes(upper)) {
        return 'PERSON';
    }
    if (['REPO', 'REPOSITORIES', 'CODEBASE', 'PROJECT', 'REPOSITORY'].includes(upper)) {
        return 'REPOSITORY';
    }
    if (['PR', 'PULLREQUEST', 'PULL-REQUEST', 'PULL_REQUEST'].includes(upper)) {
        return 'PULL_REQUEST';
    }
    if (['ISSUE', 'BUG', 'TICKET'].includes(upper)) {
        return 'ISSUE';
    }
    if (['COMMIT', 'COMMITS', 'GIT_COMMIT', 'GITCOMMIT', 'COMMIT_HASH', 'CHANGESET', 'REVISION'].includes(upper)) {
        return 'COMMIT';
    }
    return upper;
}

/**
 * Checks if an entity represents a Git commit (by label, alias, or hash pattern)
 * so it can be strictly excluded from becoming a standalone graph node.
 */
export function isCommitEntity(name: string, type?: string): boolean {
    if (type) {
        const normalized = normalizeEntityType(type);
        if (normalized === 'COMMIT') return true;
    }
    const clean = (name || '').trim();
    if (/^(commit\s*:?\s*#?|sha\s*:?\s*)?[a-f0-9]{7,40}$/i.test(clean)) return true;
    if (/^commit\s+[a-z0-9_-]+$/i.test(clean)) return true;
    return false;
}

/**
 * Resolves and upserts all entities into Neo4j with normalized entity types.
 *
 * @param entities            Entities confirmed by LLM (type known)
 * @param newEntity           New entities suggested by LLM (type suggested)
 * @param extraPropertiesMap  Optional map of entity name → extra properties (e.g. email, role)
 */
export async function resolveEntity(
    entities: ExtractedEntity[],
    newEntity: NewEntities[],
    extraPropertiesMap?: Record<string, Record<string, any>>,
    existingSession?: any
) {
    // P0-1: Filter out COMMIT entities so individual git commits are never stored as standalone nodes in Neo4j
    const allEntities = [
        ...entities.map(e => ({ name: e.name, type: normalizeEntityType(e.type) })),
        ...newEntity.map(e => ({ name: e.name, type: normalizeEntityType(e.suggestedType) }))
    ].filter(e => !isCommitEntity(e.name, e.type))

    const idMap: Record<string, string> = {}
    for (const entity of allEntities) {
        try {
            let extras: Record<string, any> | undefined = undefined
            if (extraPropertiesMap) {
                extras = extraPropertiesMap[entity.name]
                if (!extras) {
                    const lowerName = entity.name.toLowerCase()
                    const foundKey = Object.keys(extraPropertiesMap).find(k =>
                        k.toLowerCase() === lowerName ||
                        k.toLowerCase().includes(lowerName) ||
                        lowerName.includes(k.toLowerCase())
                    )
                    if (foundKey) {
                        extras = extraPropertiesMap[foundKey]
                    } else if (entity.type === 'PERSON' && Object.keys(extraPropertiesMap).length === 1) {
                        extras = Object.values(extraPropertiesMap)[0]
                    }
                }
            }

            const realID = await upsertEntity(entity.name, entity.type, extras, existingSession)
            if (realID) {
                idMap[entity.name] = realID
            } else {
                console.warn(`[EntityResolver] upsertEntity returned no ID for "${entity.name}" (${entity.type}) — relations involving this entity will be skipped`)
            }
        }
        catch (error: any) {
            console.log(`Error While Inserting Node in Graph DB ${error?.message}`)
        }
    }

    return idMap
}