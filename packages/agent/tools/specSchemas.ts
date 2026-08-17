import { z } from 'zod';

/**
 * Spec schemas for all LLM tools.
 * Provides strict runtime validation and TypeScript typing for tool calls.
 */

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
