/**
 * Expanded Tool Definitions for LLM-Driven Query Pipeline.
 *
 * Each existing graph function is exposed as its own distinctly-named tool
 * so the LLM planner can choose the optimal function for each query.
 * A new `graph_traverse` tool handles open-ended exploration.
 *
 * NO regex-based intent routing exists here — the LLM selects tools
 * via native function-calling with rich, capability-based descriptions.
 */

export const TOOL_DEFINITIONS = [
    // ─── Knowledge Risk ───────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'knowledge_risk',
            description: 'Engineering Knowledge Loss & Departure Risk Calculator. Evaluates human single-point-of-failure dependencies and calculates a comprehensive 6-component risk breakdown: (1) Ownership concentration in repos, (2) Critical architecture dependencies, (3) Recent commit/PR activity, (4) Undocumented code gaps, (5) Unique siloed tech expertise, and (6) Assigned pending tickets/work. MANDATORY for ANY question asking about what happens if someone leaves/departs/resigns, backup maintainers upon departure, unowned components if an engineer leaves, or team-wide departure risk. Examples: "What happens if Priya leaves?", "If Priya Sharma leaves tomorrow, which repositories have no backup maintainer?", "Who is the most critical person to retain?", "Break down knowledge risk across the team". Pass personName="ALL" for whole-team analysis.',
            parameters: {
                type: 'object',
                properties: {
                    personName: {
                        type: 'string',
                        description: 'Name of the engineer/person to analyze (e.g. "Priya", "Arjun"), or "ALL" to evaluate all engineers.',
                    },
                },
                required: ['personName'],
            },
        },
    },

    // ─── SQL Search ───────────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'sql_search',
            description: 'PostgreSQL Relational Engineering Metrics & Risk Tables. Queries computed codebase health metrics, bus factors, repository risk rankings, contributor event counts, and raw event records. MANDATORY for ANY question mentioning "bus factor", "SPOF repos", "repository risk scores", "contributor event counts". Examples: "Which repos have bus factor 1?", "Rank repos by risk score", "Show active contributors per repo", "Which repositories with Bus Factor = 1 also have open issues?". Use queryType="unsupported" if the question cannot be answered by the available query types.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['repos_by_bus_factor', 'repo_risk', 'recent_events', 'count_by_provider', 'events_by_author', 'event_by_id', 'active_engineers', 'unsupported'],
                        description: 'Query template: "repos_by_bus_factor" for SPOF repos (params.threshold), "repo_risk" for risk scores, "active_engineers" for contributor counts, "event_by_id" for raw event inspection, "unsupported" if no template fits.',
                    },
                    params: {
                        type: 'object',
                        description: 'Query parameters, e.g. { threshold: 1 } for repos_by_bus_factor, { eventId: "..." } for event_by_id, { author: "..." } for events_by_author.',
                    },
                },
                required: ['queryType'],
            },
        },
    },

    // ─── Graph: Describe Entity ───────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_describe_entity',
            description: 'Get full details, properties, and all connections of a specific entity in the knowledge graph. Returns the entity\'s name, type, email, role, and every relationship it has. Use for questions like: "What is Arjun\'s email?", "Tell me about Priya Sharma", "Who is Vikram Patel?", "What role does Neha have?", "Show me details about checkout-service". For listing ALL people/engineers, pass entity="people" or entity="engineers".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Entity name to describe (e.g. "Priya Sharma", "checkout-service", "React"). For listing all people, pass "people" or "engineers".',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Count By Label ────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_count_by_label',
            description: 'Count how many entities exist in the knowledge graph matching a label and/or search term. Use for questions like: "How many developers do we have?" (label="PERSON"), "How many repositories exist?" (label="REPOSITORY"), "How many technologies are in use?" (label="TECHNOLOGY"), "How many commits mention Kafka?" (searchTerm="Kafka").',
            parameters: {
                type: 'object',
                properties: {
                    searchTerm: {
                        type: 'string',
                        description: 'Optional text to filter entity names (e.g. "Kafka", "Priya"). Empty string for total count.',
                    },
                    label: {
                        type: 'string',
                        description: 'Node label to count (e.g. "PERSON", "REPOSITORY", "TECHNOLOGY", "COMMIT", "ISSUE", "PULL_REQUEST"). Empty string to count all labels.',
                    },
                },
                required: ['label'],
            },
        },
    },

    // ─── Graph: List Nodes ────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_list_nodes',
            description: 'List entities connected to a source entity, optionally filtered by relationship type and target label. Automatically falls back to multi-hop (2-hop) if 1-hop returns no results. Use for questions like: "What repos does Priya work on?" (entity="Priya", targetLabel="REPOSITORY"), "What technologies does Vikram use?" (entity="Vikram", relation="USES", targetLabel="TECHNOLOGY"), "Show connections of auth-gateway".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Source entity name (e.g. "Priya Sharma", "checkout-service").',
                    },
                    targetLabel: {
                        type: 'string',
                        description: 'Optional target node label filter (e.g. "REPOSITORY", "TECHNOLOGY", "PERSON").',
                    },
                    relation: {
                        type: 'string',
                        description: 'Optional relationship type filter (e.g. "AUTHORED", "USES", "PART_OF", "DEPENDS_ON", "WORKS_ON").',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Repository Summary ────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_repository_summary',
            description: 'Get a comprehensive summary of one or all repositories, including contributors (with emails/roles), work item counts, and recent entities. Use for questions like: "Show me repos and who is responsible for each", "Who maintains checkout-service?", "List all repositories with their contributors", "Who are the contributors to billing-service?".',
            parameters: {
                type: 'object',
                properties: {
                    repositoryName: {
                        type: 'string',
                        description: 'Specific repository name (e.g. "checkout-service"), or empty/"ALL" for all repositories.',
                    },
                },
            },
        },
    },

    // ─── Graph: Shortest Path ─────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_shortest_path',
            description: 'Find the shortest path between two entities in the knowledge graph. Returns all nodes and relationships along the path. Use for questions like: "How is auth-gateway connected to billing-service?", "What is the shortest path between Priya and checkout-service?", "Show the dependency path from X to Y".',
            parameters: {
                type: 'object',
                properties: {
                    from: {
                        type: 'string',
                        description: 'Source entity name.',
                    },
                    to: {
                        type: 'string',
                        description: 'Target entity name.',
                    },
                },
                required: ['from', 'to'],
            },
        },
    },

    // ─── Graph: Dependency Analysis ───────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_dependency_analysis',
            description: 'Analyze upstream dependencies (what this entity depends on) and downstream dependents (what depends on this entity) up to 3 hops. Use for questions like: "What does checkout-service depend on?", "What services depend on auth-gateway?", "Show the dependency tree of billing-service".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Entity name to analyze dependencies for.',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Impact Analysis ───────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_impact_analysis',
            description: 'Analyze the impact/blast radius if an entity changes or fails — what upstream and downstream systems are affected. Use for questions like: "What would be impacted if auth-gateway goes down?", "What is the blast radius of changes to billing-service?".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Entity name to analyze impact for.',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Expertise Analysis ────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_expertise_analysis',
            description: 'Find who has expertise or domain knowledge about a specific entity, ranked by evidence count (authored work, related commits). Use for questions like: "Who knows the most about Kafka?", "Who is the expert on checkout-service?", "Who has worked with Redis the most?".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Entity name to find experts for (e.g. "Kafka", "checkout-service", "React").',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Count Connected Nodes ─────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_count_nodes',
            description: 'Count how many nodes of a specific type are connected to an entity via a specific relationship. Use for questions like: "How many repos has Priya authored?", "How many commits does Vikram have in billing-service?".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Source entity name.',
                    },
                    targetLabel: {
                        type: 'string',
                        description: 'Label of target nodes to count (e.g. "REPOSITORY", "COMMIT").',
                    },
                    relation: {
                        type: 'string',
                        description: 'Relationship type (e.g. "AUTHORED"). Defaults to "AUTHORED".',
                    },
                    scopeName: {
                        type: 'string',
                        description: 'Optional scope filter (e.g. repository name to scope count within).',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── Graph: Search Entity Candidates ──────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_search_candidates',
            description: 'Fuzzy-search for entity candidates in the knowledge graph by name, email, or external ID. Returns matching entities with their type, email, and role. Use when you need to disambiguate or verify whether an entity exists before querying it, or for questions like: "Is there someone named Priya in the system?", "Find entities matching checkout".',
            parameters: {
                type: 'object',
                properties: {
                    searchTerm: {
                        type: 'string',
                        description: 'Search term to match against entity names/emails (e.g. "Priya", "checkout").',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of candidates to return. Defaults to 5.',
                    },
                },
                required: ['searchTerm'],
            },
        },
    },

    // ─── Graph: Open-Ended Traversal ──────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_traverse',
            description: 'Open-ended knowledge graph traversal with LLM-specified depth, relations, direction, and target labels. Use this when NO existing specialized graph tool fits — for example: exploring multi-hop chains across diverse relationship types, finding indirect connections, or custom-depth exploration. The relations, depth range, and limit are all decided by YOU based on the query. ONLY use relation types and labels from the live schema provided in the system context.',
            parameters: {
                type: 'object',
                properties: {
                    startEntities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Entity names to start the traversal from.',
                    },
                    relations: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Relationship types to traverse (from the live schema). Empty array = any relation.',
                    },
                    depth: {
                        type: 'object',
                        properties: {
                            min: { type: 'number', description: 'Minimum traversal depth (default 1).' },
                            max: { type: 'number', description: 'Maximum traversal depth (default 3). Use higher (4-6) for deep chain exploration.' },
                        },
                        description: 'Depth range for traversal. Shallow (1-2) for direct connections, deep (3-6) for chain analysis.',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of results to return (default 20).',
                    },
                    direction: {
                        type: 'string',
                        enum: ['outgoing', 'incoming', 'both'],
                        description: 'Traversal direction: "outgoing" follows edges away from start, "incoming" follows edges toward start, "both" follows both.',
                    },
                    targetLabels: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional filter: only return nodes with these labels (from the live schema).',
                    },
                },
                required: ['startEntities'],
            },
        },
    },

    // ─── Vector Search ────────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'vector_search',
            description: 'Qdrant Semantic Unstructured Knowledge Search. Searches embeddings of Slack conversations, PR descriptions, architectural decisions (ADRs), RFCs, incident postmortems, and Jira ticket discussions. Use for "why" questions, rationale behind technical decisions, incident causes, migration reasoning, or searching for specific text/issues/breaking changes in PRs and messages. Do NOT use for departure risk (use knowledge_risk) or structured metrics/bus factor (use sql_search) or dependency graphs (use graph tools). Examples: "Why was Redis replaced with Valkey?", "What caused the auth-gateway latency issue?", "Tell me about the backend architecture rationale", "Find PRs mentioning breaking changes".',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Semantic search phrase targeting the core technical topic, issue, incident, or rationale.',
                    },
                },
                required: ['query'],
            },
        },
    },

    // ─── Web Search ───────────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'web_search',
            description: 'External Web Search. Use for external public documentation, third-party libraries, CVE vulnerability advisories, or internet technical references.',
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
];
