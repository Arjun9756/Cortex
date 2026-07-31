import { GRAPH_ACTIONS } from '../../graph/graph.service.js'

export const TOOL_DEFINITIONS = [
    {
        type: 'function' as const,
        function: {
            name: 'graph_search',
            description: 'Search the Neo4j graph database for named-entity facts: email address, mail, role, title, designation, contact info, "who is X", commit/PR counts, relationships, dependencies, usage ("what uses X", "kis kisme use hua"), expertise, or repository summaries. This is the ONLY tool that returns exact personal properties like email and role. If the user asks for knowledge risk AND personal details (e.g. email or role) about the same person, you MUST call BOTH knowledge_risk AND graph_search — do not assume knowledge_risk returns personal details.',
            parameters: {
                type: 'object',
                properties: {
                    entities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Exact entity names, emails, or IDs extracted from the user question (e.g. ["Arjun", "Redis"]).',
                    },
                    action: {
                        type: 'string',
                        enum: GRAPH_ACTIONS as unknown as string[],
                        description: 'Type of graph query: describeEntity (default for mail/email, role/title, who is), countNodes (how many commits/items), listNodes (usages/what uses X), shortestPath (relationship between 2 nodes), dependencyAnalysis, impactAnalysis, expertiseAnalysis, or repositorySummary.',
                    },
                    relation: {
                        type: 'string',
                        description: 'Relationship type from live schema or standard relations like USES, AUTHORED, PART_OF.',
                    },
                    target: {
                        type: 'string',
                        description: 'Target node label filter from live schema like COMMIT, REPOSITORY, PERSON, TECHNOLOGY.',
                    },
                },
                required: ['entities'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'vector_search',
            description: 'Perform semantic search over unstructured event content: explanations, architectural decisions, discussions, "why" questions ("why was X replaced", "kyun replace hua"), Slack message text, commit messages, PR descriptions, or narrative context. This tool does NOT return exact entity properties (email, role), exact event IDs, or event counts — for those, use graph_search or sql_search. If the question asks for BOTH an explanation AND a property (e.g. "why was Redis removed AND what is Arjun\'s email"), you MUST call BOTH vector_search AND graph_search.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Focused semantic sub-question to embed and search (e.g. "Why was Valkey used in place of Redis?").',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'sql_search',
            description: 'Query the raw Postgres events table for recent logs, raw event payloads, event IDs (messageId), provider counts by time window, or author event history. This tool does NOT return graph relationships or knowledge risk scores. Use it when the question asks for exact event ID, raw payload, provider counts, or recent activity logs.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['recent_events', 'count_by_provider', 'events_by_author', 'event_by_id'],
                        description: 'Predefined safe SQL query template to execute.',
                    },
                    params: {
                        type: 'object',
                        description: 'Parameters for the query such as limit, provider, days, author, or eventId.',
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
            description: 'Calculates ONLY a person\'s knowledge-loss risk score and its breakdown (ownership %, dependency %, activity %, documentation %, expertise %, pendingWork %). This tool does NOT return personal details like email, role, job title, contact information, or any graph relationship data. If the user\'s question also asks for personal details (email, role, title) or graph relationships for the same person, you MUST also call graph_search in the same turn — do not assume knowledge_risk alone is sufficient. Use this for: "what is the knowledge risk for X", "what happens if X leaves", "X leaves the cortex/team", "departure risk of X", "knowledge loss if X leaves".',
            parameters: {
                type: 'object',
                properties: {
                    personName: {
                        type: 'string',
                        description: 'Name of the person to calculate knowledge risk for (e.g. "Arjun Kumar").',
                    },
                },
                required: ['personName'],
            },
        },
    },
]
