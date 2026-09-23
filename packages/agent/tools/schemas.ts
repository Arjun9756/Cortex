import { z } from 'zod';

export interface ToolResultEnvelope<T = any> {
    evidence: T[];
    confidence: number;             // 0.0 - 1.0 rating of evidence relevance
    sourceType: 'graph' | 'vector' | 'sql' | 'analytics' | 'cypher';
    entitiesFound: string[];        // Extracted entity names found in evidence
    queryExplanation: string;       // Human-readable summary of what the tool executed
    hasMoreContext: boolean;        // True if pagination/truncation occurred
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 CORE GENERALIZED TOOLS SCHEMAS (Strict Zod)
// ─────────────────────────────────────────────────────────────────────────────

// 1. get_commit_count
export const GetCommitCountInputSchema = z.object({
    repo: z.string().optional().describe('Repository name to filter commits (e.g. "billing-engine", "core-platform-gateway")'),
    person: z.string().optional().describe('Person / engineer name to filter commits (e.g. "priyasharma", "michaelchen")'),
    date_range: z.string().optional().describe('Optional time window (e.g. "30d", "90d", "last year")'),
});
export type GetCommitCountInput = z.infer<typeof GetCommitCountInputSchema>;

export const GetCommitCountOutputSchema = z.object({
    totalCommits: z.number().int().min(0),
    repository: z.string().optional(),
    person: z.string().optional(),
    breakdown: z.array(z.object({
        name: z.string(),
        commits: z.number().int().min(0),
    })),
    source: z.string(),
});
export type GetCommitCountOutput = z.infer<typeof GetCommitCountOutputSchema>;

// 2. get_repo_contributors
export const GetRepoContributorsInputSchema = z.object({
    repo: z.string().min(1, 'Repository name is required').describe('Repository name (e.g. "billing-engine", "payment-gateway-v2")'),
});
export type GetRepoContributorsInput = z.infer<typeof GetRepoContributorsInputSchema>;

export const GetRepoContributorsOutputSchema = z.object({
    repository: z.string(),
    contributorCount: z.number().int().min(0),
    primaryOwner: z.string().nullable(),
    busFactor: z.number(),
    status: z.string(),
    contributors: z.array(z.object({
        name: z.string(),
        commits: z.number().int().min(0),
        role: z.string().nullable().optional(),
    })),
});
export type GetRepoContributorsOutput = z.infer<typeof GetRepoContributorsOutputSchema>;

// 3. get_person_activity
export const GetPersonActivityInputSchema = z.object({
    person: z.string().min(1, 'Person name is required').describe('Engineer name (e.g. "priyasharma", "rohanverma")'),
    date_range: z.string().optional().describe('Optional date range or time period'),
    limit: z.number().int().min(1).max(50).optional().default(10),
});
export type GetPersonActivityInput = z.infer<typeof GetPersonActivityInputSchema>;

export const GetPersonActivityOutputSchema = z.object({
    person: z.string(),
    activityCount: z.number().int().min(0),
    activities: z.array(z.object({
        id: z.string(),
        event_type: z.string(),
        repository: z.string(),
        summary: z.string(),
        formatted_date: z.string(),
        provider: z.string(),
    })),
});
export type GetPersonActivityOutput = z.infer<typeof GetPersonActivityOutputSchema>;

// 4. get_ownership
export const GetOwnershipInputSchema = z.object({
    repo: z.string().min(1, 'Repository name is required').describe('Repository name (e.g. "billing-engine", "realtime-stream-engine")'),
});
export type GetOwnershipInput = z.infer<typeof GetOwnershipInputSchema>;

export const GetOwnershipOutputSchema = z.object({
    repository: z.string(),
    primaryOwner: z.string().nullable(),
    busFactor: z.number(),
    status: z.string(),
    totalCommits: z.number().int().min(0),
    ownershipBreakdown: z.array(z.object({
        person: z.string(),
        commits: z.number().int().min(0),
        percentage: z.number(),
        isPrimaryOwner: z.boolean(),
    })),
});
export type GetOwnershipOutput = z.infer<typeof GetOwnershipOutputSchema>;

// 5. get_bus_factor
export const GetBusFactorInputSchema = z.object({
    repo: z.string().optional().describe('Repository name (e.g. "billing-engine"). Omit or pass "ALL" to get all repositories.'),
});
export type GetBusFactorInput = z.infer<typeof GetBusFactorInputSchema>;

export const GetBusFactorOutputSchema = z.object({
    repositories: z.array(z.object({
        repoName: z.string(),
        busFactor: z.number(),
        riskScore: z.number(),
        contributorCount: z.number().int().min(0),
        primaryOwner: z.string().nullable(),
        status: z.string(),
        isSPOF: z.boolean(),
    })),
});
export type GetBusFactorOutput = z.infer<typeof GetBusFactorOutputSchema>;

// 6. get_successor_recommendation
export const GetSuccessorRecommendationInputSchema = z.object({
    repo: z.string().optional().describe('Repository name to find successors/backup owners for (e.g. "billing-engine")'),
    person: z.string().optional().describe('Engineer name whose departure requires successors (e.g. "priyasharma")'),
});
export type GetSuccessorRecommendationInput = z.infer<typeof GetSuccessorRecommendationInputSchema>;

export const GetSuccessorRecommendationOutputSchema = z.object({
    target: z.string(),
    targetType: z.enum(['repository', 'person']),
    primaryOwner: z.string().optional(),
    busFactor: z.number().optional(),
    hasSuccessor: z.boolean(),
    explanation: z.string(),
    recommendedSuccessor: z.object({
        name: z.string(),
        score: z.number(),
        sharedTechnologies: z.array(z.string()),
        sharedRepositories: z.array(z.string()),
        capacityScore: z.number(),
        rationale: z.string(),
        warningLabel: z.string().optional(),
        isOverloaded: z.boolean(),
    }).nullable(),
    candidates: z.array(z.object({
        name: z.string(),
        score: z.number(),
        sharedTechnologies: z.array(z.string()),
        sharedRepositories: z.array(z.string()),
        capacityScore: z.number(),
        rationale: z.string(),
        isOverloaded: z.boolean(),
    })),
});
export type GetSuccessorRecommendationOutput = z.infer<typeof GetSuccessorRecommendationOutputSchema>;

// 7. get_recent_changes
export const GetRecentChangesInputSchema = z.object({
    repo: z.string().min(1, 'Repository name is required').describe('Repository name (e.g. "billing-engine", "auth-token-vault")'),
    days: z.number().int().min(1).max(365).optional().default(30).describe('Number of days back to look (default 30)'),
});
export type GetRecentChangesInput = z.infer<typeof GetRecentChangesInputSchema>;

export const GetRecentChangesOutputSchema = z.object({
    repository: z.string(),
    days: z.number(),
    totalChanges: z.number().int().min(0),
    changes: z.array(z.object({
        id: z.string(),
        provider: z.string(),
        eventType: z.string(),
        author: z.string(),
        summary: z.string(),
        createdAt: z.string(),
    })),
});
export type GetRecentChangesOutput = z.infer<typeof GetRecentChangesOutputSchema>;

// 8. get_related_entities
export const GetRelatedEntitiesInputSchema = z.object({
    entity: z.string().min(1, 'Entity name is required').describe('Name of technology, repository, or person (e.g. "React", "Kafka", "billing-engine")'),
    relationType: z.string().optional().describe('Optional relation type filter (e.g. "USES", "WORKS_ON", "DEPENDS_ON")'),
    depth: z.number().int().min(1).max(3).optional().default(1),
});
export type GetRelatedEntitiesInput = z.infer<typeof GetRelatedEntitiesInputSchema>;

export const GetRelatedEntitiesOutputSchema = z.object({
    entity: z.string(),
    connections: z.array(z.object({
        targetName: z.string(),
        targetType: z.string(),
        relation: z.string(),
    })),
});
export type GetRelatedEntitiesOutput = z.infer<typeof GetRelatedEntitiesOutputSchema>;

// 9. search_evidence
export const SearchEvidenceInputSchema = z.object({
    query: z.string().min(1, 'Query string is required').describe('Search query for Slack discussions, commit messages, Jira tickets, or architectural rationales'),
    limit: z.number().int().min(1).max(20).optional().default(5),
});
export type SearchEvidenceInput = z.infer<typeof SearchEvidenceInputSchema>;

export const SearchEvidenceOutputSchema = z.object({
    query: z.string(),
    matches: z.array(z.object({
        source: z.string(),
        text: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
        score: z.number().optional(),
    })),
});
export type SearchEvidenceOutput = z.infer<typeof SearchEvidenceOutputSchema>;

// 10. get_person_identity
export const GetPersonIdentityInputSchema = z.object({
    alias: z.string().min(1, 'Alias or name is required').describe('Alias, email, username, or display name to resolve (e.g. "Arjun9756", "priya.sharma@company.com", "michaelchen")'),
});
export type GetPersonIdentityInput = z.infer<typeof GetPersonIdentityInputSchema>;

export const GetPersonIdentityOutputSchema = z.object({
    found: z.boolean(),
    canonicalPersonId: z.string().nullable(),
    displayName: z.string(),
    email: z.string().nullable(),
    username: z.string().nullable(),
    externalId: z.string().nullable(),
    knownAliases: z.array(z.string()),
    commitCount: z.number().int().min(0),
    repos: z.array(z.string()),
    technologies: z.array(z.string()),
});
export type GetPersonIdentityOutput = z.infer<typeof GetPersonIdentityOutputSchema>;


// ─────────────────────────────────────────────────────────────────────────────
// PRE-EXISTING & BACKWARD-COMPATIBLE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

// ─── Graph: Open-Ended Traversal Spec ────────────────────────────────
export const GraphTraversalSpec = z.object({
    startEntities: z.array(z.string()).min(1, 'At least one start entity is required'),
    relations: z.array(z.string()).optional().default([]),
    depth: z.object({
        min: z.number().int().min(1).default(1),
        max: z.number().int().min(1).max(10).default(3),
    }).optional().default({ min: 1, max: 3 }),
    limit: z.number().int().min(1).max(200).optional().default(20),
    direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('outgoing'),
    targetLabels: z.array(z.string()).optional().default([]),
});

export type GraphTraversalSpecType = z.infer<typeof GraphTraversalSpec>;

// ─── Graph: Describe Entity Spec ─────────────────────────────────────
export const DescribeEntitySpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
});

export type DescribeEntitySpecType = z.infer<typeof DescribeEntitySpec>;

// ─── Graph: Count By Label Spec ──────────────────────────────────────
export const CountByLabelSpec = z.object({
    searchTerm: z.string().optional().default(''),
    label: z.string().optional().default(''),
});

export type CountByLabelSpecType = z.infer<typeof CountByLabelSpec>;

// ─── Graph: List Nodes Spec ──────────────────────────────────────────
export const ListNodesSpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
    targetLabel: z.string().optional().default(''),
    relation: z.string().optional().default(''),
});

export type ListNodesSpecType = z.infer<typeof ListNodesSpec>;

// ─── Graph: Repository Summary Spec ──────────────────────────────────
export const RepositorySummarySpec = z.object({
    repositoryName: z.string().optional().default(''),
});

export type RepositorySummarySpecType = z.infer<typeof RepositorySummarySpec>;

// ─── Graph: Shortest Path Spec ───────────────────────────────────────
export const ShortestPathSpec = z.object({
    from: z.string().min(1, 'from entity name is required'),
    to: z.string().min(1, 'to entity name is required'),
});

export type ShortestPathSpecType = z.infer<typeof ShortestPathSpec>;

// ─── Graph: Dependency Analysis Spec ─────────────────────────────────
export const DependencyAnalysisSpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
});

export type DependencyAnalysisSpecType = z.infer<typeof DependencyAnalysisSpec>;

// ─── Graph: Impact Analysis Spec ─────────────────────────────────────
export const ImpactAnalysisSpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
});

export type ImpactAnalysisSpecType = z.infer<typeof ImpactAnalysisSpec>;

// ─── Graph: Expertise Analysis Spec ──────────────────────────────────
export const ExpertiseAnalysisSpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
});

export type ExpertiseAnalysisSpecType = z.infer<typeof ExpertiseAnalysisSpec>;

// ─── Graph: Count Nodes Spec ─────────────────────────────────────────
export const CountNodesSpec = z.object({
    entity: z.string().min(1, 'entity name is required'),
    targetLabel: z.string().optional().default(''),
    relation: z.string().optional().default('AUTHORED'),
    scopeName: z.string().optional().default(''),
});

export type CountNodesSpecType = z.infer<typeof CountNodesSpec>;

// ─── Graph: Search Candidates Spec ───────────────────────────────────
export const SearchCandidatesSpec = z.object({
    searchTerm: z.string().min(1, 'searchTerm is required'),
    limit: z.number().int().min(1).max(50).optional().default(5),
});

export type SearchCandidatesSpecType = z.infer<typeof SearchCandidatesSpec>;

// ─── SQL Query Spec ──────────────────────────────────────────────────
export const SqlQuerySpec = z.object({
    queryType: z.enum([
        'repos_by_bus_factor',
        'repo_risk',
        'recent_events',
        'count_by_provider',
        'events_by_author',
        'event_by_id',
        'active_engineers',
        'repo_details',
        'healthy_vs_fragile',
        'jira_tickets',
        'slack_search',
        'person_repos',
        'person_profile',
        'unsupported',
    ]),
    params: z.record(z.string(), z.any()).optional().default({}),
});

export type SqlQuerySpecType = z.infer<typeof SqlQuerySpec>;

// ─── Vector Query Spec ───────────────────────────────────────────────
export const VectorQuerySpec = z.object({
    query: z.string().min(1, 'Query string is required'),
});

export type VectorQuerySpecType = z.infer<typeof VectorQuerySpec>;

// ─── Knowledge Risk Spec ─────────────────────────────────────────────
export const KnowledgeRiskSpec = z.object({
    personName: z.string().min(1, 'personName is required'),
});

export type KnowledgeRiskSpecType = z.infer<typeof KnowledgeRiskSpec>;

// ─── Legacy Schemas (Backward Compatibility) ─────────────────────────
export const GraphSearchSchema = z.object({
    entities: z.array(z.string()).min(1, 'At least one entity name is required'),
    action: z.string().optional().default('describeEntity'),
    relation: z.string().optional().default(''),
    target: z.string().optional().default(''),
});

export const VectorSearchSchema = z.object({
    query: z.string().min(1, 'Query string is required'),
});

export const KnowledgeRiskLegacySchema = z.object({
    personName: z.string().min(1, 'personName is required'),
});

export const SqlSearchSchema = z.object({
    queryType: z.string(),
    params: z.record(z.string(), z.any()).optional().default({}),
});

export type GraphSearchInput = z.infer<typeof GraphSearchSchema>;
export type VectorSearchInput = z.infer<typeof VectorSearchSchema>;
export type KnowledgeRiskInput = z.infer<typeof KnowledgeRiskLegacySchema>;
export type SqlSearchInput = z.infer<typeof SqlSearchSchema>;
