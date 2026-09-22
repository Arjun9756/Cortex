import sql from '../../../apps/api/config/postgres.js'
import { normalizeGithubEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph, PersonMetadata } from '../../extraction/processExtraction.js'
import { isCommitEntity } from '../../extraction/entityResolver.js'
import { resolveIdentity } from '../../identity/canonicalPerson.service.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
import { rollbackEventRelations } from '../../database/neo4j/graph.repository.js'
import crypto from 'crypto'
import { ContentEmbedding } from '@google/genai'
import { isBotAccount } from '../../shared/botDetection.js'

export async function processGithubEvent(eventID: string) {
    try {
        // 1.Get Payload From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event With Event ID For Github ${eventID} Not Found in Database`)
            return null
        }

        const rawPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload ?? {})

        // 2.Normalized The Payload
        const normalizedPayload = normalizeGithubEvent(rawPayload, event.event_type) // This is Object convert to string while sending to AI
        // LLM Train
        if (!normalizedPayload)
            return

        // 3.Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4.Extract From LLM with Deterministic Fast-Fallback for resilience against 429 rate limits
        let entities: any[] = []
        let newEntities: any[] = []
        let relationships: any[] = []
        let newRelations: any[] = []
        let summary = ''

        try {
            const extracted = await extractFromEvent(cleanEventText, 'github')
            entities = extracted.entities || []
            newEntities = extracted.newEntities || []
            relationships = extracted.relationships || []
            newRelations = extracted.newRelations || []
            summary = extracted.summary || ''
        } catch (llmErr: any) {
            console.warn(`[GitHub Ingestion] LLM extraction failed (${llmErr?.message}) — executing deterministic graph extraction fallback.`)
            
            // Deterministic Fast-Path: extract core entities strictly adhering to ontology.ts
            if (normalizedPayload.author && normalizedPayload.repository) {
                entities.push({ name: normalizedPayload.author, type: 'PERSON' })
                entities.push({ name: normalizedPayload.repository, type: 'REPOSITORY' })
                relationships.push({
                    from: normalizedPayload.author,
                    to: normalizedPayload.repository,
                    type: 'WORKS_ON',
                    evidence: 'pushed code'
                })

                // Contribution rollup edges are created per commit author below
            }
            summary = `GitHub ${normalizedPayload.eventType || 'push'} by ${normalizedPayload.author || 'contributor'} in ${normalizedPayload.repository || 'repository'}`
        }

        // P0-1 Defense-in-depth: Filter out any COMMIT entities extracted by LLM paths to prevent node explosion
        entities = entities.filter((e: any) => !isCommitEntity(e.name, e.type))
        newEntities = newEntities.filter((e: any) => !isCommitEntity(e.name, e.suggestedType))

        // Relationship Rewiring & Cleansing:
        // If an LLM connected a technology/file/issue to a commit (e.g. commit -> USES -> Redis),
        // rewire the relationship to the Repository so critical technical connections are preserved!
        const repoName = normalizedPayload.repository
        if (repoName) {
            // Ensure the repository itself is registered as an entity so it can anchor rewired relations
            const hasRepo = entities.some((e: any) => e.name === repoName) ||
                            newEntities.some((e: any) => e.name === repoName)
            if (!hasRepo) {
                entities.push({ name: repoName, type: 'REPOSITORY' })
            }
        }

        const authorName = normalizedPayload.author
        if (authorName && authorName !== 'unknown') {
            // Ensure the author is registered as an entity so CONTRIBUTED_TO relations are resolved
            const hasAuthor = entities.some((e: any) => e.name === authorName) ||
                              newEntities.some((e: any) => e.name === authorName)
            if (!hasAuthor) {
                entities.push({ name: authorName, type: 'PERSON' })
            }
        }

        if (repoName) {
            for (const r of relationships) {
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
            for (const r of newRelations) {
                if (isCommitEntity(r.from)) {
                    r.from = repoName
                }
                if (isCommitEntity(r.to)) {
                    if (r.suggestedType === 'AUTHORED' || r.suggestedType === 'CREATED' || r.suggestedType === 'WORKS_ON') {
                        r.to = repoName
                        r.suggestedType = 'CONTRIBUTED_TO'
                    }
                }
            }
        }

        // Strictly drop any relationships that still reference an unresolved commit
        relationships = relationships.filter((r: any) => !isCommitEntity(r.from) && !isCommitEntity(r.to))
        newRelations = newRelations.filter((r: any) => !isCommitEntity(r.from) && !isCommitEntity(r.to))

        // 5. Attribute commits to individual authors and build CONTRIBUTED_TO relationships
        interface CommitAuthorGroup {
            author: string
            email: string | null
            username?: string
            externalId?: string
            commitCount: number
            lastCommitAt: number
            isBot: boolean
        }

        const defaultAuthor = normalizedPayload.author && normalizedPayload.author !== 'unknown' ? normalizedPayload.author : 'unknown'
        const defaultEmail = normalizedPayload.authorEmail || rawPayload.pusher?.email || rawPayload.sender?.email || null
        const defaultUsername = rawPayload.sender?.login || undefined
        const defaultTimestamp = Date.parse(normalizedPayload.timestamp) || Date.now()

        const authorGroups = new Map<string, CommitAuthorGroup>()

        if (Array.isArray(normalizedPayload.commits) && normalizedPayload.commits.length > 0) {
            for (const c of normalizedPayload.commits) {
                const cAuthorName = c.author?.name || c.author?.username || defaultAuthor
                const cEmail = c.author?.email || (cAuthorName === defaultAuthor ? defaultEmail : null)
                const cUsername = c.author?.username || (cAuthorName === defaultAuthor ? defaultUsername : undefined)
                const cTimestamp = c.timestamp ? (Date.parse(c.timestamp) || defaultTimestamp) : defaultTimestamp
                const cIsBot = c.isBot ?? isBotAccount(cAuthorName, cEmail, cUsername)

                // Key distinct authors by email if available, else username/name
                const groupKey = (cEmail || cUsername || cAuthorName).toLowerCase()
                const existing = authorGroups.get(groupKey)
                if (existing) {
                    existing.commitCount += 1
                    if (cTimestamp > existing.lastCommitAt) {
                        existing.lastCommitAt = cTimestamp
                    }
                    if (!existing.email && cEmail) existing.email = cEmail
                    if (!existing.username && cUsername) existing.username = cUsername
                    if (cIsBot) existing.isBot = true
                } else {
                    authorGroups.set(groupKey, {
                        author: cAuthorName,
                        email: cEmail,
                        username: cUsername,
                        commitCount: 1,
                        lastCommitAt: cTimestamp,
                        isBot: cIsBot
                    })
                }

                // P1-6: Attribute credit to co-authors specified via Co-authored-by trailers
                if (Array.isArray(c.coAuthors) && c.coAuthors.length > 0) {
                    for (const co of c.coAuthors) {
                        if (!co.email) continue;
                        const coKey = co.email.toLowerCase();
                        const coIsBot = isBotAccount(co.name, co.email);
                        const coExisting = authorGroups.get(coKey);
                        if (coExisting) {
                            coExisting.commitCount += 1;
                            if (cTimestamp > coExisting.lastCommitAt) {
                                coExisting.lastCommitAt = cTimestamp;
                            }
                            if (coIsBot) coExisting.isBot = true;
                        } else {
                            authorGroups.set(coKey, {
                                author: co.name,
                                email: co.email,
                                username: undefined,
                                commitCount: 1,
                                lastCommitAt: cTimestamp,
                                isBot: coIsBot
                            });
                        }
                    }
                }
            }
        } else if (normalizedPayload.eventType === 'push' && defaultAuthor !== 'unknown') {
            // Push event without explicit commits array
            const isBot = isBotAccount(defaultAuthor, defaultEmail, defaultUsername)
            const groupKey = (defaultEmail || defaultUsername || defaultAuthor).toLowerCase()
            authorGroups.set(groupKey, {
                author: defaultAuthor,
                email: defaultEmail,
                username: defaultUsername,
                commitCount: 1,
                lastCommitAt: defaultTimestamp,
                isBot
            })
        }

        // Connect each commit author group to the repository via CONTRIBUTED_TO
        if (normalizedPayload.repository && normalizedPayload.repository !== 'unknown') {
            for (const group of authorGroups.values()) {
                // Ensure PERSON entity exists in entities
                const hasPerson = entities.some((e: any) => e.name?.toLowerCase() === group.author.toLowerCase()) ||
                                  newEntities.some((e: any) => e.name?.toLowerCase() === group.author.toLowerCase())
                if (!hasPerson) {
                    entities.push({ name: group.author, type: 'PERSON' })
                }

                const existingContrib = relationships.find((r: any) => 
                    (r.type === 'CONTRIBUTED_TO' || r.suggestedType === 'CONTRIBUTED_TO') && 
                    r.from?.toLowerCase() === group.author.toLowerCase() && 
                    r.to?.toLowerCase() === normalizedPayload.repository.toLowerCase()
                )

                if (existingContrib) {
                    existingContrib.from = group.author
                    existingContrib.to = normalizedPayload.repository
                    existingContrib.type = 'CONTRIBUTED_TO'
                    existingContrib.commitCount = (existingContrib.commitCount || 0) + group.commitCount
                    existingContrib.lastCommitAt = Math.max(existingContrib.lastCommitAt || 0, group.lastCommitAt)
                    existingContrib.properties = {
                        ...(existingContrib.properties || {}),
                        commitCount: existingContrib.commitCount,
                        lastCommitAt: existingContrib.lastCommitAt
                    }
                } else {
                    relationships.push({
                        from: group.author,
                        to: normalizedPayload.repository,
                        type: 'CONTRIBUTED_TO',
                        evidence: `${group.commitCount} commit(s) pushed`,
                        commitCount: group.commitCount,
                        lastCommitAt: group.lastCommitAt,
                        properties: {
                            commitCount: group.commitCount,
                            lastCommitAt: group.lastCommitAt
                        }
                    })
                }

                // Remove duplicate uncounted from newRelations if present
                const existingNewIdx = newRelations.findIndex((r: any) =>
                    (r.suggestedType === 'CONTRIBUTED_TO' || r.type === 'CONTRIBUTED_TO') && 
                    r.from?.toLowerCase() === group.author.toLowerCase() && 
                    r.to?.toLowerCase() === normalizedPayload.repository.toLowerCase()
                )
                if (existingNewIdx !== -1) {
                    newRelations.splice(existingNewIdx, 1)
                }
            }
        }

        // 6. Resolve canonical identity and build person metadata for all event participants
        const personMetadata: PersonMetadata[] = []
        const resolvedPersonMap = new Map<string, PersonMetadata>()

        interface ActorCandidate {
            author: string
            email?: string | null
            username?: string
            externalId?: string
            isBot?: boolean
        }
        const actorsToResolve: ActorCandidate[] = []

        // Primary event author
        if (normalizedPayload.author && normalizedPayload.author !== 'unknown') {
            const rawExternalId = rawPayload.sender?.id 
                ?? rawPayload.pull_request?.user?.id 
                ?? rawPayload.issue?.user?.id 
                ?? rawPayload.comment?.user?.id 
                ?? rawPayload.sender?.login 
                ?? rawPayload.head_commit?.author?.username 
                ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined)
            
            const externalId = rawExternalId ? String(rawExternalId) : `github_${normalizedPayload.author || 'unknown'}`
            const username = rawPayload.sender?.login 
                ?? rawPayload.pull_request?.user?.login 
                ?? rawPayload.issue?.user?.login 
                ?? rawPayload.head_commit?.author?.username 
                ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined)
            const displayName = rawPayload.head_commit?.author?.name 
                ?? rawPayload.pusher?.name 
                ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined) 
                ?? username
            const email = normalizedPayload.authorEmail 
                ?? rawPayload.head_commit?.author?.email 
                ?? rawPayload.pusher?.email 
                ?? rawPayload.sender?.email 
                ?? undefined

            actorsToResolve.push({
                author: normalizedPayload.author,
                email,
                username,
                externalId,
                isBot: normalizedPayload.isBot ?? isBotAccount(displayName, email, username, externalId)
            })
        }

        // Individual commit authors
        for (const group of authorGroups.values()) {
            actorsToResolve.push({
                author: group.author,
                email: group.email,
                username: group.username,
                externalId: group.username ? `github_${group.username}` : (group.email ? `email_${group.email}` : `github_${group.author}`),
                isBot: group.isBot
            })
        }

        for (const actor of actorsToResolve) {
            const dedupeKey = (actor.email || actor.username || actor.author).toLowerCase()
            if (resolvedPersonMap.has(dedupeKey)) continue

            let canonicalPersonId: string | null = null
            const hasAuthorInfo = Boolean(
                (actor.externalId && actor.externalId !== 'unknown') ||
                actor.email ||
                (actor.username && actor.username !== 'unknown') ||
                (actor.author && actor.author !== 'unknown')
            )

            if (hasAuthorInfo) {
                try {
                    const identityRes = await resolveIdentity({
                        provider: 'github',
                        externalId: actor.externalId || `github_${actor.author}`,
                        username: actor.username || actor.author,
                        email: actor.email || undefined,
                        displayName: actor.author,
                    })
                    canonicalPersonId = identityRes.canonicalPersonId

                    if (identityRes.matchedBy === 'NEW_PERSON') {
                        console.log(`[IdentityResolution] [GitHub] Created new canonical person: ${identityRes.canonicalPersonId} for ${actor.author} (externalId: ${actor.externalId})`)
                    } else {
                        console.log(`[IdentityResolution] [GitHub] Linked existing canonical person: ${identityRes.canonicalPersonId} for ${actor.author} via ${identityRes.matchedBy} (confidence: ${identityRes.confidence}, reason: ${identityRes.reason})`)
                    }
                } catch (idErr: any) {
                    console.warn(`[GitHub Ingestion] Identity resolution warning for ${actor.author}: ${idErr?.message}`)
                }
            }

            const meta: PersonMetadata = {
                name: actor.author,
                email: actor.email ?? null,
                role: null,
                externalId: actor.externalId || `github_${actor.author}`,
                canonicalPersonId,
                isBot: actor.isBot ?? isBotAccount(actor.author, actor.email, actor.username, actor.externalId),
            }
            resolvedPersonMap.set(dedupeKey, meta)
            personMetadata.push(meta)
        }

        // Build entity metadata (issue / PR status)
        const entityMetadata: Array<{ name: string; properties: Record<string, any> }> = []
        if (normalizedPayload.eventType === 'issues' && normalizedPayload.title) {
            entityMetadata.push({
                name: normalizedPayload.title,
                properties: {
                    status: normalizedPayload.action === 'closed' ? 'closed' : 'open'
                }
            })
        } else if (normalizedPayload.eventType === 'pull_request' && normalizedPayload.title) {
            entityMetadata.push({
                name: normalizedPayload.title,
                properties: {
                    status: normalizedPayload.merged ? 'merged' : (normalizedPayload.action === 'closed' ? 'closed' : 'open')
                }
            })

            // Automatic Self-Healing: If a Pull Request was CLOSED WITHOUT MERGE (Rejected/Declined PR),
            // automatically rollback speculative relations created during PR open/update events!
            if (normalizedPayload.action === 'closed' && !normalizedPayload.merged) {
                const prId = String(rawPayload.pull_request?.id || rawPayload.number || '');
                if (prId) {
                    try {
                        const previousEvents = await sql`
                            SELECT id FROM events 
                            WHERE provider = 'github' 
                              AND (payload->'pull_request'->>'id' = ${prId} OR payload->>'number' = ${prId})
                              AND id != ${eventID}
                        `;
                        for (const prev of previousEvents) {
                            const deleted = await rollbackEventRelations(prev.id);
                            if (deleted > 0) {
                                console.log(`[GitHub Ingestion] Auto-rollback: PR #${prId} was closed without merge. Rolled back ${deleted} relations from previous event ${prev.id}.`);
                            }
                        }
                    } catch (rbErr: any) {
                        console.warn(`[GitHub Ingestion] Warning during PR auto-rollback: ${rbErr?.message}`);
                    }
                }
            }
        }

        // 6. Save Onto Graph Database (with enriched PERSON and ENTITY metadata + rollback traceability)
        await saveExtractionToGraph(
            entities,
            newEntities,
            relationships,
            newRelations,
            personMetadata,
            entityMetadata,
            { sourceEventId: eventID, confidence: 1.0 }
        )

        // 7.Process The Summary To Create Vector Embeddings For Semantic Search
        const effectiveSummary = summary && summary.trim().length > 0 
            ? summary.trim() 
            : `GitHub ${normalizedPayload.eventType || 'event'} by ${normalizedPayload.author || 'unknown'} in repository ${normalizedPayload.repository || 'unknown'}: ${normalizedPayload.message || 'code change'}`

        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(effectiveSummary)

        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            // P2-9: Use stable deterministic UUID derived from eventID to prevent duplicate vectors on retry
            const hash = crypto.createHash('md5').update(String(eventID)).digest('hex')
            const stableVectorId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`

            await upsertVector(stableVectorId, vectorEmbedding, {
                eventID,
                summary: effectiveSummary,
                entities: allEntities,
                relationships: allRelations,
                provider: "github",
                repository: normalizedPayload.repository,
                timestamp: normalizedPayload.timestamp,
                author: normalizedPayload.author
            })
            console.log('Vector Embedding Created (stable point ID)')
        }

        console.log(`Event ${eventID} processed. Summary: ${summary}`)
    }
    catch (error: any) {
        console.log(`Error While Processing Github Events Through Queue Workers ${error?.message}`)
        throw new Error(error?.message || "Not Able To Proceed Further Github Events Through Queue Workers")
    }
}