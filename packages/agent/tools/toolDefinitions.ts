/**
 * Enhanced Tool Definitions for Autonomous Generalized Agent Query Pipeline.
 *
 * Exposes 10 core data retrieval tools covering the full graph/relational/vector space,
 * plus specialized analytical and traversal tools.
 *
 * Each tool has strict JSON schemas and rich capability docstrings for native LLM function-calling on Groq.
 */

export const CORE_TOOL_DEFINITIONS = [
    // ─── 1. get_commit_count ──────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_commit_count',
            description: 'Get verified commit counts for a repository, a specific engineer/person, all repositories, or top contributor rankings. MANDATORY for ANY question asking "how many commits in <repo>", "how many commits did <person> make", "how many commits done by <person> today", "how many commits in all repo", "which repo has highest commits", or "who has made the highest commits" / "which person has made highest commit". Reads from compacted CONTRIBUTED_TO rollups, PostgreSQL events, and person_metrics.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name to filter commits (e.g. "billing-engine", "core-platform-gateway", "payment-gateway-v2"). Omit or pass "ALL" to get total commits across all repositories along with repository rankings.',
                    },
                    person: {
                        type: 'string',
                        description: 'Engineer/person name to filter commits (e.g. "priyasharma", "michaelchen", "Arjun9756"). Omit to get contributor rankings across the organization.',
                    },
                    date_range: {
                        type: 'string',
                        description: 'Optional date range / time window filter (e.g. "today", "yesterday", "7d", "30d", "90d", "last year").',
                    },
                },
            },
        },
    },

    // ─── 2. get_repo_contributors ─────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_repo_contributors',
            description: 'Get all contributors, contributor count, primary owner, bus factor, and health status for a repository. MANDATORY for questions asking who contributes to a repo, list contributors for a repo, or who works on a repository.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name (e.g. "billing-engine", "auth-token-vault").',
                    },
                },
                required: ['repo'],
            },
        },
    },

    // ─── 3. get_person_activity ───────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_person_activity',
            description: 'Get the recent activity history (commits, pull requests, issues, Slack discussions) for a specific engineer. MANDATORY for questions asking what an engineer recently did, their latest work, or recent activity with dates.',
            parameters: {
                type: 'object',
                properties: {
                    person: {
                        type: 'string',
                        description: 'Engineer/person name (e.g. "rohanverma", "Priya Sharma").',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum events to return (default 10).',
                    },
                },
                required: ['person'],
            },
        },
    },

    // ─── 4. get_ownership ─────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_ownership',
            description: 'Calculate code ownership percentages per contributor for a repository based on commit contribution distribution. MANDATORY for questions asking about repository ownership breakdown, who owns what percentage of a repo, or code distribution.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name (e.g. "billing-engine", "customer-portal-next").',
                    },
                },
                required: ['repo'],
            },
        },
    },

    // ─── 5. get_bus_factor ────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_bus_factor',
            description: 'Get bus factor, risk score, primary owner, contributor count, and SPOF status for one or all repositories from the verified risk scoring pipeline. MANDATORY for questions asking about bus factor, single point of failure (SPOF) repos, fragile repos, or repository risk ranking.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name to check (e.g. "billing-engine"), or omit / pass "ALL" to list all repositories.',
                    },
                },
            },
        },
    },

    // ─── 6. get_successor_recommendation ──────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_successor_recommendation',
            description: 'Calculate successor engineer recommendations and backup maintainers for a repository or person using the EXACT 4-factor scoring engine used in the dashboard. MANDATORY for ANY question asking "who is the best successor for <repo>", "who is the best successor for this repo", "who will replace <person>", "backup maintainer for <repo>", or who can take over a repository if someone departs.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name to find successors/backup owners for (e.g. "billing-engine", "core-platform-gateway").',
                    },
                    person: {
                        type: 'string',
                        description: 'Engineer/person name whose departure requires successors (e.g. "priyasharma", "michaelchen").',
                    },
                },
            },
        },
    },

    // ─── 7. get_recent_changes ────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_recent_changes',
            description: 'Get recent changes, commits, PRs, and events in a repository over the last N days. MANDATORY for questions asking what changed recently in a repo or repository history over the last N days.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Repository name (e.g. "billing-engine", "realtime-stream-engine").',
                    },
                    days: {
                        type: 'number',
                        description: 'Number of days to look back (default 30).',
                    },
                },
                required: ['repo'],
            },
        },
    },

    // ─── 8. get_related_entities ──────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_related_entities',
            description: 'Find related entities, technologies, repositories, and dependencies connected to a given technology, module, or service in the knowledge graph. Use for questions like "What technologies are used with React?", "What is related to Kafka?", or "Dependencies of billing-engine".',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Name of the technology, service, repository, or person (e.g. "Kafka", "PostgreSQL", "React").',
                    },
                    relationType: {
                        type: 'string',
                        description: 'Optional relation type to filter (e.g. "USES", "DEPENDS_ON", "WORKS_ON").',
                    },
                },
                required: ['entity'],
            },
        },
    },

    // ─── 9. search_evidence ───────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'search_evidence',
            description: 'Semantic vector search and text evidence retrieval across Slack discussions, architectural decisions, Jira tickets, and incident notes. MANDATORY for questions asking "why" a migration or replacement happened, Slack discussion references, or architectural rationales.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search phrase or keywords (e.g. "why was redis replaced with valkey", "AWS KMS key rotation discussion").',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum matches to return (default 5).',
                    },
                },
                required: ['query'],
            },
        },
    },

    // ─── 10. get_person_identity ──────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_person_identity',
            description: 'Resolve an engineer\'s verified canonical person identity, email, username, aliases, commit counts, and owned repositories. Use for identifying people, finding emails, or resolving aliases (e.g. "Arjun9756" -> Arjun Kumar).',
            parameters: {
                type: 'object',
                properties: {
                    alias: {
                        type: 'string',
                        description: 'Name, alias, GitHub username, or email to resolve (e.g. "Arjun9756", "priyasharma").',
                    },
                },
                required: ['alias'],
            },
        },
    },

    // ─── 11. get_pr_cycle_time ────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'get_pr_cycle_time',
            description: 'Get verified PR Review Cycle Time and Total Lead Time metrics for a repository or whole organization. Computes median (p50) business hours (Mon-Fri 09:00-18:00, weekends excluded), p90, distribution, size context, and segregates >30d outliers. Grounded in /docs/metrics-definitions.md.',
            parameters: {
                type: 'object',
                properties: {
                    repo: {
                        type: 'string',
                        description: 'Optional repository name (e.g. "billing-engine", "notification-service"). Omit for company-wide PR metrics.',
                    },
                    days: {
                        type: 'number',
                        description: 'Number of days to evaluate (default 90).',
                    },
                    includeBots: {
                        type: 'boolean',
                        description: 'Whether to include automated bot PRs (default false).',
                    },
                },
            },
        },
    },
];

export const TOOL_DEFINITIONS = [
    ...CORE_TOOL_DEFINITIONS,

    // ─── Knowledge Risk (Full Breakdown) ──────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'knowledge_risk',
            description: 'Comprehensive Knowledge Loss, Departure Risk & 6-Factor Risk Breakdown Calculator. Evaluates human single-point-of-failure dependencies, departure impact, and team-wide risk scores. Pass personName="ALL" for whole-team analysis.',
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

    // ─── SQL Search (Relational Templates) ─────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'sql_search',
            description: 'PostgreSQL Relational Engineering Metrics & Risk Tables. Queries computed codebase health metrics, bus factors, repository risk rankings, contributor event counts, and raw event records.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['repos_by_bus_factor', 'repo_risk', 'recent_events', 'count_by_provider', 'events_by_author', 'event_by_id', 'active_engineers', 'repo_details', 'healthy_vs_fragile', 'jira_tickets', 'slack_search', 'person_repos', 'person_profile', 'unsupported'],
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

    // ─── Graph: Describe Entity ───────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_describe_entity',
            description: 'Get full details, properties, and all connections of a specific entity in the knowledge graph. Returns the entity\'s name, type, email, role, and every relationship it has.',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Entity name to describe (e.g. "Priya Sharma", "checkout-service", "React").',
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
            description: 'Count how many entities exist in the knowledge graph matching a label (REPOSITORY, TECHNOLOGY, PERSON). Note: for commits, always use get_commit_count.',
            parameters: {
                type: 'object',
                properties: {
                    searchTerm: {
                        type: 'string',
                        description: 'Optional text to filter entity names.',
                    },
                    label: {
                        type: 'string',
                        description: 'Node label to count ("PERSON", "REPOSITORY", "TECHNOLOGY").',
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
            description: 'List nodes of a specific target label connected to an entity via a relationship.',
            parameters: {
                type: 'object',
                properties: {
                    entity: {
                        type: 'string',
                        description: 'Starting entity name.',
                    },
                    targetLabel: {
                        type: 'string',
                        description: 'Target node label ("REPOSITORY", "TECHNOLOGY", "PERSON").',
                    },
                    relation: {
                        type: 'string',
                        description: 'Relationship type ("USES", "WORKS_ON", "CONTRIBUTED_TO").',
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
            description: 'Get summary for repository including contributors, work items, and technologies.',
            parameters: {
                type: 'object',
                properties: {
                    repositoryName: {
                        type: 'string',
                        description: 'Repository name or "ALL".',
                    },
                },
                required: ['repositoryName'],
            },
        },
    },

    // ─── Graph: Shortest Path ─────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'graph_shortest_path',
            description: 'Find shortest path connecting two entities in the knowledge graph.',
            parameters: {
                type: 'object',
                properties: {
                    from: { type: 'string', description: 'Starting entity.' },
                    to: { type: 'string', description: 'Destination entity.' },
                },
                required: ['from', 'to'],
            },
        },
    },

    // ─── Vector Search ────────────────────────────────────────────────
    {
        type: 'function' as const,
        function: {
            name: 'vector_search',
            description: 'Search semantic vector embeddings for commit messages, discussions, and technical rationale.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query.' },
                },
                required: ['query'],
            },
        },
    },
];
