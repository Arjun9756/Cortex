import neo4j from 'neo4j-driver'
import env from './env.js'
import { enforceGraphQueryPolicy } from '../../../packages/database/neo4j/queryPolicy.js'
import { runGraphWrite } from '../../../packages/database/neo4j/graphWrite.repository.js'
import type { DataSource } from '../../../packages/database/provenance.js'

const uri = env.NEO4J_URI
const username = env.NEO4J_USERNAME
const password = env.NEO4J_PASSWORD

if (!uri || !username || !password) {
    throw new Error('[Neo4j] NEO4J_URI, NEO4J_USERNAME and NEO4J_PASSWORD must be configured')
}

// `neo4j+s://` is correct for Aura clusters and requires routing discovery.
// The database name must be supplied on every session (and connectivity check),
// otherwise the driver silently uses its default database rather than NEO4J_DATABASE.
export const neo4jDatabase = env.NEO4J_DATABASE || 'neo4j'
export const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionPoolSize: 20,
    connectionAcquisitionTimeout: 5_000,
    maxTransactionRetryTime: 5_000,
})

const originalSession = driver.session.bind(driver)
driver.session = function (config: any = {}) {
    const session = originalSession({ database: neo4jDatabase, ...config })
    return new Proxy(session, {
        get(target, property) {
            if (property === 'run') return (cypher: string, params: Record<string, unknown> = {}) => {
                if (/\b(?:CREATE|MERGE|SET|DELETE|REMOVE|DETACH\s+DELETE)\b/i.test(cypher)
                    && !/^\s*CREATE\s+(?:INDEX|CONSTRAINT)\b/i.test(cypher)) {
                    const guardedParams = params.source === undefined && process.env.CORTEX_ENV === 'local-dev'
                        && ['development', 'test'].includes(process.env.NODE_ENV || '') && process.env.CORTEX_ACTIVE_SEED_SOURCE
                        ? { ...params, source: process.env.CORTEX_ACTIVE_SEED_SOURCE as DataSource }
                        : params as Record<string, unknown> & { source: DataSource }
                    return runGraphWrite((query, queryParams) => target.run(query, queryParams), cypher, guardedParams)
                }
                const guarded = enforceGraphQueryPolicy(cypher, params)
                return target.run(guarded.cypher, guarded.params)
            }
            const value = Reflect.get(target, property, target)
            return typeof value === 'function' ? value.bind(target) : value
        }
    }) as typeof session
}

export function neo4jSession(config: Record<string, unknown> = {}) {
    return driver.session({ database: neo4jDatabase, ...config })
}

export async function verifyNeo4jConnectivity(attempts = 3): Promise<void> {
    let lastError: unknown
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await driver.verifyConnectivity({ database: neo4jDatabase })
            const session = neo4jSession()
            try {
                await session.run('RETURN 1 AS ok')
            } finally {
                await session.close()
            }
            console.log(`[Neo4j] Connected to database "${neo4jDatabase}"`)
            return
        } catch (error: any) {
            lastError = error
            console.warn(`[Neo4j] Connectivity attempt ${attempt}/${attempts} failed: ${error?.code || 'Error'} ${error?.message}`)
            if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 500))
        }
    }
    throw lastError
}
