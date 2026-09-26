import { enforceGraphQueryPolicy } from './queryPolicy.js';
import { assertWritableDataSource, type DataSource } from '../provenance.js';

export type GraphQueryRunner = (cypher: string, params?: Record<string, unknown>) => Promise<unknown>;

/** The sole low-level Neo4j mutation entry point used by the shared driver session. */
export function runGraphWrite(
    execute: GraphQueryRunner,
    cypher: string,
    params: Record<string, unknown> & { source: DataSource }
): Promise<unknown> {
    if (!(params.source === 'seed:legacy-unverified' && /\.source\s+IS\s+NULL/i.test(cypher))) {
        assertWritableDataSource(params.source);
    }
    const guarded = enforceGraphQueryPolicy(cypher, params);
    return execute(guarded.cypher, guarded.params);
}
