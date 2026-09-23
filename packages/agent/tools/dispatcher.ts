import {
    GetCommitCountInputSchema,
    GetRepoContributorsInputSchema,
    GetPersonActivityInputSchema,
    GetOwnershipInputSchema,
    GetBusFactorInputSchema,
    GetSuccessorRecommendationInputSchema,
    GetRecentChangesInputSchema,
    GetRelatedEntitiesInputSchema,
    SearchEvidenceInputSchema,
    GetPersonIdentityInputSchema,
} from './schemas.js';
import {
    executeGetCommitCount,
    executeGetRepoContributors,
    executeGetPersonActivity,
    executeGetOwnership,
    executeGetBusFactor,
    executeGetSuccessorRecommendation,
    executeGetRecentChanges,
    executeGetRelatedEntities,
    executeSearchEvidence,
    executeGetPersonIdentity,
} from './coreTools.service.js';

export interface ToolExecutionResult {
    toolName: string;
    args: Record<string, any>;
    success: boolean;
    data: any;
    summary: string;
    error?: string;
    latencyMs: number;
}

/**
 * Validates and executes any of the 10 Core Tools.
 * Rejects invalid payloads with descriptive Zod errors.
 */
export async function dispatchCoreTool(toolName: string, rawArgs: any): Promise<ToolExecutionResult> {
    const tStart = Date.now();
    const args = (typeof rawArgs === 'object' && rawArgs !== null) ? rawArgs : {};

    try {
        switch (toolName) {
            case 'get_commit_count': {
                const parsed = GetCommitCountInputSchema.parse(args);
                const data = await executeGetCommitCount(parsed);
                const subject = parsed.repo ? `repo "${data.repository}"` : (parsed.person ? `engineer "${data.person}"` : 'organization');
                const summary = `Commit count for ${subject}: ${data.totalCommits} total commits (${data.source}).`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_repo_contributors': {
                const parsed = GetRepoContributorsInputSchema.parse(args);
                const data = await executeGetRepoContributors(parsed);
                const summary = `Repository "${data.repository}" has ${data.contributorCount} contributor(s), primary owner: ${data.primaryOwner || 'None'}, bus factor: ${data.busFactor}.`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_person_activity': {
                const parsed = GetPersonActivityInputSchema.parse(args);
                const data = await executeGetPersonActivity(parsed);
                const summary = `Retrieved ${data.activityCount} recent activity event(s) for ${data.person}.`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_ownership': {
                const parsed = GetOwnershipInputSchema.parse(args);
                const data = await executeGetOwnership(parsed);
                const topOwner = data.ownershipBreakdown[0];
                const topText = topOwner ? `${topOwner.person} (${topOwner.percentage}%)` : 'none';
                const summary = `Ownership for "${data.repository}": Primary Owner is ${data.primaryOwner || 'none'}, Top contributor: ${topText}, Total commits: ${data.totalCommits}.`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_bus_factor': {
                const parsed = GetBusFactorInputSchema.parse(args);
                const data = await executeGetBusFactor(parsed);
                const summary = `Bus factor query returned ${data.repositories.length} repository record(s).`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_successor_recommendation': {
                const parsed = GetSuccessorRecommendationInputSchema.parse(args);
                const data = await executeGetSuccessorRecommendation(parsed);
                const topName = data.recommendedSuccessor?.name || 'None';
                const topScore = data.recommendedSuccessor?.score ?? 0;
                const summary = `Successor analysis for ${data.targetType} "${data.target}": Top recommended successor is ${topName} (${topScore}% match). ${data.explanation}`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_recent_changes': {
                const parsed = GetRecentChangesInputSchema.parse(args);
                const data = await executeGetRecentChanges(parsed);
                const summary = `Retrieved ${data.totalChanges} recent change(s) in repository "${data.repository}" over the last ${data.days} days.`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_related_entities': {
                const parsed = GetRelatedEntitiesInputSchema.parse(args);
                const data = await executeGetRelatedEntities(parsed);
                const summary = `Found ${data.connections.length} related entity connection(s) for "${data.entity}".`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'search_evidence': {
                const parsed = SearchEvidenceInputSchema.parse(args);
                const data = await executeSearchEvidence(parsed);
                const summary = `Search query "${data.query}" found ${data.matches.length} matching text and discussion evidence snippet(s).`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_person_identity': {
                const parsed = GetPersonIdentityInputSchema.parse(args);
                const data = await executeGetPersonIdentity(parsed);
                const summary = data.found
                    ? `Resolved identity for "${parsed.alias}": Canonical Name "${data.displayName}", Email: ${data.email || 'None'}, Repos: [${data.repos.join(', ')}].`
                    : `No identity record found for alias "${parsed.alias}".`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            case 'get_pr_cycle_time': {
                const { GetPrCycleTimeInputSchema } = await import('./schemas.js');
                const { executeGetPrCycleTime } = await import('./coreTools.service.js');
                const parsed = GetPrCycleTimeInputSchema.parse(args);
                const data = await executeGetPrCycleTime(parsed);
                const subject = parsed.repo ? `repository "${parsed.repo}"` : 'organization';
                const summary = `PR Review Cycle Time for ${subject}: Median ${data.reviewCycleTime.headlineHours} business hours (p90: ${data.reviewCycleTime.businessHours.p90}h, Wall-clock p50: ${data.reviewCycleTime.wallClockHours.median}h). Total lead time median: ${data.totalLeadTime.headlineHours}h. Analyzed ${data.counts.mergedHumanPrs} human PRs, ${data.counts.staleOutliersCount} stale outliers (>30d).`;
                return { toolName, args, success: true, data, summary, latencyMs: Date.now() - tStart };
            }

            default:
                throw new Error(`Tool "${toolName}" is not a recognized core tool.`);
        }
    } catch (err: any) {
        const errorMsg = err?.message || 'Unknown tool execution error';
        console.warn(`[dispatchCoreTool] Execution failed for ${toolName}: ${errorMsg}`);
        return {
            toolName,
            args,
            success: false,
            data: null,
            summary: `Execution error for ${toolName}: ${errorMsg}`,
            error: errorMsg,
            latencyMs: Date.now() - tStart,
        };
    }
}

export function isCoreTool(name: string): boolean {
    return [
        'get_commit_count',
        'get_repo_contributors',
        'get_person_activity',
        'get_ownership',
        'get_bus_factor',
        'get_successor_recommendation',
        'get_recent_changes',
        'get_related_entities',
        'search_evidence',
        'get_person_identity',
        'get_pr_cycle_time',
    ].includes(name);
}
