import { GRAPH_ACTIONS } from '../../graph/graph.service.js'

export const TOOL_DEFINITIONS = [
    {
        type: 'function' as const,
        function: {
            name: 'graph_search',
            description: 'Neo4j Graph Search. Use for person email, role, title, "who is X", entity relations (USES, AUTHORED, DEPENDS_ON), technology usage, node counts (countNodes, countByLabel), or repository summary.',
            parameters: {
                type: 'object',
                properties: {
                    entities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Entity names extracted from query.',
                    },
                    action: {
                        type: 'string',
                        enum: GRAPH_ACTIONS as unknown as string[],
                        description: 'Graph action: describeEntity, countNodes, countByLabel, listNodes, shortestPath, dependencyAnalysis, impactAnalysis, expertiseAnalysis, repositorySummary.',
                    },
                    relation: {
                        type: 'string',
                        description: 'Relationship type like USES, AUTHORED, PART_OF.',
                    },
                    target: {
                        type: 'string',
                        description: 'Target label filter like COMMIT, REPOSITORY, PERSON, TECHNOLOGY.',
                    },
                },
                required: ['entities'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'sql_search',
            description: 'PostgreSQL Relational Metrics. Use for repository risk (queryType: "repo_risk"), bus factor, SPOF repos, primary owners, recent events, active engineers.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['repo_risk', 'recent_events', 'count_by_provider', 'events_by_author', 'event_by_id', 'active_engineers'],
                        description: 'Query template type.',
                    },
                    params: {
                        type: 'object',
                        description: 'Query parameters.',
                    },
                },
                required: ['queryType'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'knowledge_risk',
            description: 'Person Departure Risk Calculator. Use ONLY for engineer departure impact, knowledge loss risk, or if an engineer leaves/quits.',
            parameters: {
                type: 'object',
                properties: {
                    personName: {
                        type: 'string',
                        description: 'Person/engineer name.',
                    },
                },
                required: ['personName'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'vector_search',
            description: 'Qdrant Semantic Search. Use for architectural "why" questions, decision reasons, discussions, dates, or unstructured text search.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query.',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'web_search',
            description: 'External Web Search. Use for external libraries, framework updates, CVE advisories, or internet searches.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Web search query.',
                    },
                },
                required: ['query'],
            },
        },
    },
]
