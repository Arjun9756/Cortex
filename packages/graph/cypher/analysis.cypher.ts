import { driver } from '../../../apps/api/config/neo4j.js'
import neo4j from 'neo4j-driver'

export type EntityCandidate = { name: string; type: string }

export async function countNodes(entityName: string, targetLabel: string, relation = 'AUTHORED', scopeName = '') {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (entity)-[edge]-(target)
            WHERE toLower(entity.name) = toLower($entityName)
              AND type(edge) = $relation
              AND ($targetLabel = '' OR $targetLabel IN labels(target))
              AND ($scopeName = '' OR EXISTS {
                  MATCH (target)-[:PART_OF]-(scope)
                  WHERE toLower(scope.name) = toLower($scopeName)
              })
            RETURN entity.name AS name, count(DISTINCT target) AS count
        `, { entityName, relation, targetLabel, scopeName })
        const record = result.records[0]
        return { name: record?.get('name') ?? entityName, count: neo4j.integer.toNumber(record?.get('count') ?? neo4j.int(0)), target: targetLabel || 'nodes' }
    }
    finally { await session.close() }
}

export async function listNodes(entityName: string, targetLabel = '', relation = '') {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (entity)-[edge]-(target)
            WHERE toLower(entity.name) = toLower($entityName)
              AND ($relation = '' OR type(edge) = $relation)
              AND ($targetLabel = '' OR $targetLabel IN labels(target))
            RETURN DISTINCT target.name AS name, labels(target)[0] AS type, type(edge) AS relation
            LIMIT 50
        `, { entityName, relation, targetLabel })
        const items = result.records.map((record) => ({ name: record.get('name'), type: record.get('type'), relation: record.get('relation') }))
        return { entity: entityName, relation: relation || 'ANY', count: items.length, items }
    }
    finally { await session.close() }
}

export async function shortestPath(from: string, to: string) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (source), (target)
            WHERE toLower(source.name) = toLower($from) AND toLower(target.name) = toLower($to)
            MATCH path = shortestPath((source)-[*..5]-(target))
            RETURN [node IN nodes(path) | { name: node.name, type: labels(node)[0] }] AS nodes,
                   [edge IN relationships(path) | type(edge)] AS relations
        `, { from, to })
        return result.records.map((record) => ({ nodes: record.get('nodes'), relations: record.get('relations') }))
    }
    finally { await session.close() }
}

export async function dependencyAnalysis(entityName: string) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (entity) WHERE toLower(entity.name) = toLower($entityName)
            OPTIONAL MATCH (entity)-[:DEPENDS_ON*1..3]->(dependency)
            OPTIONAL MATCH (dependent)-[:DEPENDS_ON*1..3]->(entity)
            RETURN collect(DISTINCT {name: dependency.name, type: labels(dependency)[0]}) AS dependencies,
                   collect(DISTINCT {name: dependent.name, type: labels(dependent)[0]}) AS dependents
        `, { entityName })
        const record = result.records[0]
        return { entity: entityName, dependencies: (record?.get('dependencies') ?? []).filter((item: { name?: string }) => item.name), dependents: (record?.get('dependents') ?? []).filter((item: { name?: string }) => item.name) }
    }
    finally { await session.close() }
}

export async function impactAnalysis(entityName: string) {
    return dependencyAnalysis(entityName)
}

export async function expertiseAnalysis(entityName: string) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (person:PERSON)-[:AUTHORED|WORKS_ON]->(work)-[:MENTIONED_IN|USES|DEPENDS_ON]-(entity)
            WHERE toLower(entity.name) = toLower($entityName)
            RETURN person.name AS person, count(DISTINCT work) AS evidenceCount, collect(DISTINCT work.name)[0..10] AS work
            ORDER BY evidenceCount DESC LIMIT 10
        `, { entityName })
        return result.records.map((record) => ({ person: record.get('person'), evidenceCount: neo4j.integer.toNumber(record.get('evidenceCount')), work: record.get('work') }))
    }
    finally { await session.close() }
}

export async function repositorySummary(repositoryName: string) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (repository:REPOSITORY) WHERE toLower(repository.name) = toLower($repositoryName)
            OPTIONAL MATCH (work)-[:PART_OF]-(repository)
            OPTIONAL MATCH (person:PERSON)-[:AUTHORED]->(work)
            RETURN repository.name AS repository,
                count(DISTINCT work) AS workItems,
                collect(DISTINCT {name: person.name, type: 'PERSON'})[0..20] AS contributors,
                collect(DISTINCT {name: work.name, type: labels(work)[0]})[0..30] AS recentEntities
        `, { repositoryName })
        const record = result.records[0]
        if (!record) return null
        return { repository: record.get('repository'), workItems: neo4j.integer.toNumber(record.get('workItems')), contributors: record.get('contributors').filter((item: { name?: string }) => item.name), recentEntities: record.get('recentEntities').filter((item: { name?: string }) => item.name) }
    }
    finally { await session.close() }
}

export async function searchEntityCandidates(searchTerm: string, limit = 5): Promise<EntityCandidate[]> {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (entity)
            WHERE toLower(entity.name) CONTAINS toLower($searchTerm)
            RETURN entity.name AS name, labels(entity)[0] AS type
            ORDER BY CASE WHEN toLower(entity.name) = toLower($searchTerm) THEN 0 ELSE 1 END, entity.name
            LIMIT $limit
        `, { searchTerm, limit: neo4j.int(limit) })
        return result.records.map((record) => ({ name: record.get('name'), type: record.get('type') }))
    }
    finally { await session.close() }
}

export async function describeEntity(entityName: string) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (entity) WHERE toLower(entity.name) = toLower($entityName)
            OPTIONAL MATCH (entity)-[relation]-(connected)
            RETURN entity.name AS name, labels(entity)[0] AS type, properties(entity) AS properties,
                collect(DISTINCT { relation: type(relation), connectedTo: connected.name, connectedType: labels(connected)[0] }) AS connections
        `, { entityName })
        const record = result.records[0]
        if (!record) return null
        return {
            name: record.get('name'), type: record.get('type'), properties: record.get('properties'),
            connections: record.get('connections').filter((item: { connectedTo?: string }) => item.connectedTo),
        }
    }
    finally { await session.close() }
}
