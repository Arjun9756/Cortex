export interface WorkspaceMetric {
    id?: string;
    repo_count?: number;
    contributor_count?: number;
    knowledge_risk_avg?: number;
    bus_factor_avg?: number | string;
    open_issues_count?: number;
    open_prs_count?: number;
    computed_at?: string;
}

export interface RepoMetric {
    id?: number;
    external_id: string;
    repo_name: string;
    bus_factor: number;
    risk_score: number;
    primary_owner?: string;
    contributor_count?: number;
    top_technologies?: any;
    computed_at?: string;
}

export interface PersonMetric {
    id?: number;
    external_id: string;
    person_name: string;
    risk_score: number;
    top_technologies?: Array<{ name: string; score: number }> | any;
    repos?: string[] | any;
    commit_count?: number;
    computed_at?: string;
}

export interface TechnologyMetric {
    id?: number | string;
    tech_name?: string;
    technology_name?: string;
    usage_percent: number;
    repo_count?: number;
    contributor_count?: number;
    computed_at?: string;
}

export interface TimelineEvent {
    id: string;
    provider: 'github' | 'slack' | 'jira' | 'deploy' | string;
    event_type?: string;
    title?: string;
    author?: string;
    date?: string;
    repo?: string;
    payload?: Record<string, any>;
    created_at: string;
}

export interface HealthScoreInfo {
    score: number;
    grade: string;
    statusText: string;
    statusColor: string;
    explanation: string;
    breakdown: {
        avgBusFactor: number;
        avgKnowledgeRisk: number;
        spofRepoCount: number;
        totalRepos: number;
    };
}

export interface ActivityTrendItem {
    week: string;
    count: number;
    commits: number;
    prs: number;
}

export interface RiskAlertItem {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    category: 'Bus Factor' | 'Knowledge Risk' | 'PR Risk' | 'Skill Dependency';
    entityName: string;
    entityType: 'repo' | 'person' | 'tech' | 'pr';
    whyItMatters: string;
    riskScore: number;
}

export interface DashboardStats {
    repoCount: number;
    peopleCount: number;
    techCount: number;
    avgBusFactor: number;
    openHighRiskPrs: number;
    totalRiskAlertsCount: number;
}

export interface DashboardOverviewResponse {
    workspace?: WorkspaceMetric;
    healthScore?: HealthScoreInfo;
    stats?: DashboardStats;
    riskAlerts?: RiskAlertItem[];
    activityTrend?: ActivityTrendItem[];
    repos: RepoMetric[];
    people: PersonMetric[];
    technologies?: TechnologyMetric[];
}

export interface PeopleResponse {
    people: PersonMetric[];
}

export interface BusFactorResponse {
    repos: RepoMetric[];
}

export interface TechnologiesResponse {
    technologies: TechnologyMetric[];
}

export interface TimelineResponse {
    events: TimelineEvent[];
}

export interface Finding {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    relatedEntity: string;
    relatedEntityType: 'repo' | 'person';
}

export interface FindingsResponse {
    findings: Finding[];
}

export interface DepartureSimulation {
    person: string;
    externalId: string;
    riskScore: number;
    breakdown: {
        ownership: number;
        dependency: number;
        activity: number;
        documentation: number;
        expertise: number;
        pendingWork: number;
    };
    details: {
        ownedItems: number;
        criticalDependencies: number;
        recentActivity: number;
        documentationGaps: number;
        uniqueSkills: number;
        assignedWork: number;
    };
    evidence: {
        ownership: Array<{ name: string; type: string; createdAt?: string }>;
        dependency: Array<{ name: string; type: string; dependsOn?: string }>;
        activity: Array<{ name: string; type: string; timestamp?: string | null }>;
        documentation: Array<{ name: string; type: string; issue?: string }>;
        expertise: Array<{ name: string; type: string; reason?: string }>;
        pendingWork: Array<{ name: string; type: string; status?: string }>;
    };
    affectedRepos: string[];
    affectedTechnologies: Array<{ name: string; score: number }>;
    commitCount: number;
}

export interface GraphNode {
    id: string;
    label: string; // e.g. "PERSON", "COMMIT", "REPOSITORY", "TECHNOLOGY"
    name: string;
    type?: string;
    [key: string]: any;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: string; // e.g. "AUTHORED", "USES", "PART_OF"
    label?: string;
}

export interface GraphVisualizationResponse {
    status: boolean;
    nodeCount: number;
    edgeCount: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface GraphFilters {
    repository?: string;
    personExternalId?: string;
    limit?: number;
}

export interface KnowledgeRiskScore {
    person: string;
    totalRisk: number;
    breakdown: {
        ownership: number;
        dependency: number;
        activity: number;
        documentation: number;
        expertise: number;
        pendingWork: number;
    };
    details: {
        ownedItems: number;
        criticalDependencies: number;
        recentActivity: number;
        documentationGaps: number;
        uniqueSkills: number;
        assignedWork: number;
    };
    evidence: {
        ownership: Array<{ name: string; type: string; createdAt?: string }>;
        dependency: Array<{ name: string; type: string; dependsOn?: string }>;
        activity: Array<{ name: string; type: string; timestamp?: string | null }>;
        documentation: Array<{ name: string; type: string; issue?: string }>;
        expertise: Array<{ name: string; type: string; reason?: string }>;
        pendingWork: Array<{ name: string; type: string; status?: string }>;
    };
}

export interface ChatExecutionDetails {
    query?: string;
    tools: string[];
    graphAction?: string;
    graphEntities?: string[];
    graphTarget?: string;
    graphRelation?: string;
    vectorQuery?: string;
}

export interface ChatQueryResponse {
    query?: string;
    answer: string;
    needsClarification: boolean;
    clarificationQuestion?: string;
    execution: ChatExecutionDetails;
    sources: any[];
    graphContext: any[];
    sqlContext: any[];
    knowledgeRiskResult?: KnowledgeRiskScore;
    structuredEvidence?: Array<{
        id: string;
        subgoalId?: string;
        sourceType: 'graph' | 'vector' | 'sql' | 'analytics' | 'cypher';
        confidence: number;
        summary: string;
        rawPayload?: any;
        entitiesFound?: string[];
        queryExplanation?: string;
    }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[API Client Error] ${endpoint}:`, error);
        throw error;
    }
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
    return fetchJson<DashboardOverviewResponse>('/api/dashboard/overview');
}

export async function getPeople(): Promise<PeopleResponse> {
    return fetchJson<PeopleResponse>('/api/dashboard/people');
}

export async function getBusFactor(): Promise<BusFactorResponse> {
    return fetchJson<BusFactorResponse>('/api/dashboard/bus-factor');
}

export async function getTechnologies(): Promise<TechnologiesResponse> {
    return fetchJson<TechnologiesResponse>('/api/dashboard/technologies');
}

export interface AnalyticsTrendsResponse {
    status: boolean;
    commitTrends: Array<{ label: string; commits: number; prs: number; issues?: number }>;
    graphGrowth: Array<{ label: string; nodes: number; edges: number }>;
    repoHealth: Array<{ name: string; score: number; busFactor: number; contributors: number; riskScore: number }>;
    techUsage: Array<{ name: string; pct: number; contributors: number }>;
    heatmap: Array<{ day: string; counts: number[] }>;
    metadata: {
        totalEvents: number;
        totalNodes: number;
        totalEdges: number;
        trackedRepos: number;
        trackedPeople: number;
        trackingDurationLabel: string;
    };
}

export async function getTimeline(): Promise<TimelineResponse> {
    return fetchJson<TimelineResponse>('/api/dashboard/timeline');
}

export async function getAnalyticsTrends(): Promise<AnalyticsTrendsResponse> {
    return fetchJson<AnalyticsTrendsResponse>('/api/analytics/trends');
}

export async function getGraphVisualization(filters?: GraphFilters): Promise<GraphVisualizationResponse> {
    const queryParams = new URLSearchParams();
    if (filters?.repository) queryParams.set('repository', filters.repository);
    if (filters?.personExternalId) queryParams.set('personExternalId', filters.personExternalId);
    if (filters?.limit) queryParams.set('limit', filters.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/graph/visualize${queryString ? `?${queryString}` : ''}`;
    return fetchJson<GraphVisualizationResponse>(endpoint);
}

export async function sendChatQuery(query: string): Promise<ChatQueryResponse> {
    return fetchJson<ChatQueryResponse>('/api/chat/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
    });
}

export async function streamChatQuery(
    query: string,
    onChunk: (chunkText: string) => void,
    onDone: (response: ChatQueryResponse) => void,
    onError: (err: any) => void,
    onStatus?: (stepText: string) => void
): Promise<void> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error) errorText = errData.error;
            } catch {
                // ignore
            }
            throw new Error(errorText);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            const fallback = await sendChatQuery(query);
            onDone(fallback);
            return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: status')) {
                    const dataLine = line.split('\n').find(l => l.startsWith('data: '));
                    if (dataLine && onStatus) {
                        try {
                            const { step } = JSON.parse(dataLine.slice(6));
                            if (step) onStatus(step);
                        } catch {
                            // ignore status parse error
                        }
                    }
                } else if (line.startsWith('event: chunk')) {
                    const dataLine = line.split('\n').find(l => l.startsWith('data: '));
                    if (dataLine) {
                        try {
                            const { text } = JSON.parse(dataLine.slice(6));
                            if (text) onChunk(text);
                        } catch {
                            // ignore
                        }
                    }
                } else if (line.startsWith('event: done')) {
                    const dataLine = line.split('\n').find(l => l.startsWith('data: '));
                    if (dataLine) {
                        try {
                            const finalPayload = JSON.parse(dataLine.slice(6));
                            onDone(finalPayload);
                        } catch (parseErr) {
                            onError(parseErr);
                        }
                    }
                } else if (line.startsWith('event: error')) {
                    const dataLine = line.split('\n').find(l => l.startsWith('data: '));
                    if (dataLine) {
                        try {
                            const { error } = JSON.parse(dataLine.slice(6));
                            onError(new Error(error));
                        } catch {
                            onError(new Error('Unknown streaming error'));
                        }
                    }
                }
            }
        }
    } catch (err) {
        // Fallback to non-streaming if stream endpoint encounters issues
        try {
            const fallback = await sendChatQuery(query);
            onDone(fallback);
        } catch (fallbackErr: any) {
            onError(fallbackErr?.message ? fallbackErr : err);
        }
    }
}

export async function getFindings(): Promise<FindingsResponse> {
    return fetchJson<FindingsResponse>('/api/dashboard/findings');
}

export async function simulateDeparture(externalId: string): Promise<DepartureSimulation> {
    return fetchJson<DepartureSimulation>(`/api/dashboard/people/${encodeURIComponent(externalId)}/simulate-departure`);
}

export interface IntegrationItem {
    name: string;
    isConfigured: boolean;
    webhookUrl: string;
    signatureHeader: string;
    eventCount: number;
    secretMasked?: string;
}

export interface IntegrationsStatusResponse {
    status: boolean;
    integrations: Record<string, IntegrationItem>;
}

export interface UpdateSecretResponse {
    status: boolean;
    message?: string;
}

export async function getIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
    return fetchJson<IntegrationsStatusResponse>('/api/dashboard/integrations/status');
}

export async function updateIntegrationSecrets(provider: string, secret: string): Promise<UpdateSecretResponse> {
    return fetchJson<UpdateSecretResponse>(`/api/${provider}/secret`, {
        method: 'POST',
        body: JSON.stringify({ secret }),
    });
}

export interface RepositoryDetails {
    repoName: string;
    busFactor: number;
    riskScore: number;
    status: string;
    contributorCount: number;
    primaryOwner: {
        name: string;
        email?: string;
        role?: string;
        commitCount: number;
        ownershipPercentage: number;
    } | null;
    contributors: Array<{
        name: string;
        email?: string;
        role?: string;
        commitCount: number;
    }>;
    technologies: string[];
    recentActivity: Array<{
        title: string;
        hash?: string;
        externalId?: string;
        type: string;
        date: string;
        author?: string;
    }>;
    riskExplanation: {
        summary: string;
        factors: string[];
        isSPOF: boolean;
    };
    suggestedBackups: Array<{
        name: string;
        score: number;
        sharedTechnologies: string[];
        capacityScore: number;
        rationale: string;
    }>;
}

export async function getRepositoryDetails(repoName: string): Promise<RepositoryDetails> {
    return await fetchJson<RepositoryDetails>(`/api/dashboard/repos/${encodeURIComponent(repoName)}/details`);
}

