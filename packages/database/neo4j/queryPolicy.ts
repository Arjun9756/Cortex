import { assertDataSource, assertWritableDataSource, DISPLAYABLE_SOURCES, type DataSource } from '../provenance.js';

const graphWrite = /\b(?:CREATE|MERGE|SET|DELETE|REMOVE|DETACH\s+DELETE)\b/i;
const schemaWrite = /^\s*CREATE\s+(?:INDEX|CONSTRAINT)\b/i;

function addTrustedPredicates(cypher: string, mode: 'trusted' | 'write' = 'trusted'): string {
    const matchClause = /((?:OPTIONAL\s+)?MATCH\s+)([\s\S]*?)(\s+WHERE\b|(?=\s+(?:WITH|RETURN|OPTIONAL\s+MATCH|MATCH|UNWIND|CALL|ORDER\s+BY|SKIP|LIMIT|CREATE|MERGE|SET|DELETE|DETACH)\b)|$)/gi;
    return cypher.replace(matchClause, (whole, prefix: string, pattern: string, nextClause: string) => {
        const variables = new Set<string>();
        for (const node of pattern.matchAll(/\(\s*([A-Za-z_][\w]*)\s*(?::[A-Za-z_][\w]*)?[^)]*\)/g)) if (node[1]) variables.add(node[1]);
        for (const rel of pattern.matchAll(/\[\s*([A-Za-z_][\w]*)\s*(?::[A-Za-z_][\w]*)?[^\]]*\]/g)) if (rel[1]) variables.add(rel[1]);
        const predicates = [...variables].map(variable => mode === 'write'
            ? `${variable}.source = $source`
            : `${variable}.source IN $trustedSources`);
        if (predicates.length === 0) return whole;
        const condition = predicates.join(' AND ');
        if (/^\s+WHERE\b/i.test(nextClause)) return `${prefix}${pattern}${nextClause} ${condition} AND`;
        return `${prefix}${pattern} WHERE ${condition}${nextClause}`;
    });
}

export function enforceGraphQueryPolicy(cypher: string, supplied: Record<string, unknown> = {}) {
    if (schemaWrite.test(cypher)) return { cypher, params: supplied };
    if (graphWrite.test(cypher)) {
        const batchSources = Array.isArray(supplied.batch)
            ? [...new Set(supplied.batch.map(item => {
                const itemSource = item && typeof item === 'object' ? (item as Record<string, unknown>).source : undefined;
                assertDataSource(itemSource);
                return itemSource as DataSource;
            }))]
            : [];
        if (batchSources.length > 1) {
            throw new Error('[Neo4j provenance] A graph write batch cannot mix provenance sources.');
        }
        const guardedSeed = process.env.CORTEX_ENV === 'local-dev'
            && ['development', 'test'].includes(process.env.NODE_ENV || '')
            && process.env.CORTEX_ACTIVE_SEED_SOURCE;
        const source = supplied.source ?? batchSources[0] ?? guardedSeed;
        if (batchSources.length === 1 && batchSources[0] !== source) {
            throw new Error('[Neo4j provenance] Batch item source must match the graph write source.');
        }
        const legacyQuarantine = source === 'seed:legacy-unverified' && /\.source\s+IS\s+NULL/i.test(cypher);
        if (legacyQuarantine) assertDataSource(source);
        else assertWritableDataSource(source);
        let writeCypher = cypher;
        // A DB-writing script's shared guard establishes one immutable script-specific source
        // for its process. Persist it on newly-created graph nodes and relationships.
        writeCypher = writeCypher.replace(/\b(MERGE|CREATE)\s+(\(\s*[A-Za-z_][\w]*\s*:\s*[A-Za-z_][\w]*)(\s*\{[^}]*\})?(\s*\))/g,
            (_all, verb: string, node: string, properties = '', close: string) => {
                if (/\bsource\s*:/i.test(properties)) return `${verb} ${node}${properties}${close}`;
                return `${verb} ${node}${properties ? properties.replace(/\}\s*$/, ', source: $source}') : ' {source: $source}'}${close}`;
            });
        writeCypher = writeCypher.replace(/\b(MERGE|CREATE)([\s\S]*?)(\[\s*[A-Za-z_][\w]*\s*:\s*[A-Za-z_][\w]*)(\s*\{[^}]*\})?(\s*\])/g,
            (_all, verb: string, between: string, rel: string, properties = '', close: string) => {
                if (/\bsource\s*:/i.test(properties)) return `${verb}${between}${rel}${properties}${close}`;
                return `${verb}${between}${rel}${properties ? properties.replace(/\}\s*$/, ', source: $source}') : ' {source: $source}'}${close}`;
            });
        const batchPersistsSource = batchSources.length === 1 && /\bsource\s*:\s*item\.source\b/i.test(writeCypher);
        if ((!/\$source\b/.test(writeCypher) && !batchPersistsSource)
            || !/\bsource\s*:/i.test(writeCypher) && !/\.source\s*=\s*\$source\b/i.test(writeCypher) && !batchPersistsSource) {
            throw new Error('[Neo4j provenance] Graph writes must persist the required source parameter.');
        }
        // A migration may only match missing-source records to tag them as unverified.
        if (legacyQuarantine && supplied.source === 'seed:legacy-unverified') {
            return { cypher: writeCypher, params: { ...supplied, source } };
        }
        return { cypher: addTrustedPredicates(writeCypher, 'write'), params: { ...supplied, source } };
    }

    const source = supplied.source;
    const requestedSources = Array.isArray(supplied.trustedSources) ? supplied.trustedSources : [];
    requestedSources.forEach(assertDataSource);
    const requestedSeedSources = requestedSources.filter(value => typeof value === 'string' && value.startsWith('seed:'));
    const seedReadAllowed = process.env.CORTEX_ENV === 'local-dev'
        && ['development', 'test'].includes(process.env.NODE_ENV || '')
        && typeof process.env.CORTEX_ACTIVE_SEED_SOURCE === 'string';
    const requestedSeed = typeof source === 'string' && source.startsWith('seed:') ? source : undefined;
    if (requestedSeedSources.length > 0 && (!seedReadAllowed
        || requestedSeedSources.length !== 1
        || requestedSeedSources[0] !== process.env.CORTEX_ACTIVE_SEED_SOURCE
        || (requestedSeed !== undefined && requestedSeed !== process.env.CORTEX_ACTIVE_SEED_SOURCE))) {
        throw new Error('[Neo4j provenance] Seed reads require the matching active local/test script source.');
    }
    if (requestedSeed !== undefined && (!seedReadAllowed || requestedSeed !== process.env.CORTEX_ACTIVE_SEED_SOURCE)) {
        throw new Error('[Neo4j provenance] Seed reads require the matching active local/test script source.');
    }
    // Callers cannot widen reads by supplying arbitrary trustedSources. Production and ordinary
    // application reads are always restricted to webhook/backfill data.
    const trustedSources = requestedSeed !== undefined
        ? [requestedSeed]
        : requestedSeedSources.length > 0
            ? requestedSeedSources
            : [...DISPLAYABLE_SOURCES];
    return { cypher: addTrustedPredicates(cypher), params: { ...supplied, trustedSources } };
}
