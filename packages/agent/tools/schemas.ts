import { z } from 'zod';
import { GRAPH_ACTIONS } from '../../graph/graph.service.js';

export const GraphSearchSchema = z.object({
    entities: z.array(z.string()).min(1, 'At least one entity name is required'),
    action: z.enum(GRAPH_ACTIONS).optional().default('describeEntity'),
    relation: z.string().optional().default(''),
    target: z.string().optional().default(''),
});

export const VectorSearchSchema = z.object({
    query: z.string().min(1, 'Query string is required'),
});

export const KnowledgeRiskSchema = z.object({
    personName: z.string().min(1, 'personName is required'),
});

export const SqlSearchSchema = z.object({
    queryType: z.enum(['recent_events', 'count_by_provider', 'events_by_author', 'event_by_id', 'active_engineers']),
    params: z.record(z.string(), z.any()).optional().default({}),
});

export type GraphSearchInput = z.infer<typeof GraphSearchSchema>;
export type VectorSearchInput = z.infer<typeof VectorSearchSchema>;
export type KnowledgeRiskInput = z.infer<typeof KnowledgeRiskSchema>;
export type SqlSearchInput = z.infer<typeof SqlSearchSchema>;
