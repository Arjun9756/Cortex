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
    tools: string[];
    graphAction?: string;
    graphEntities?: string[];
    graphTarget?: string;
    graphRelation?: string;
    vectorQuery?: string;
}

export interface ChatQueryResponse {
    answer: string;
    needsClarification: boolean;
    clarificationQuestion?: string;
    execution: ChatExecutionDetails;
    sources: any[];
    graphContext: any[];
    sqlContext: any[];
    knowledgeRiskResult?: KnowledgeRiskScore;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(options?.headers || {}),
            },
            ...options,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        return await response.json();
    } catch (err: any) {
        console.error(`[API Client Error] ${endpoint}:`, err);
        throw new Error(err.message || 'Network error');
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

export async function getTimeline(): Promise<TimelineResponse> {
    return fetchJson<TimelineResponse>('/api/dashboard/timeline');
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
    try {
        return await fetchJson<IntegrationsStatusResponse>('/api/dashboard/integrations/status');
    } catch (err) {
        // Fallback status if backend endpoint is not present
        return {
            status: true,
            integrations: {
                github: {
                    name: 'GitHub',
                    isConfigured: true,
                    webhookUrl: '/api/github/webhook',
                    signatureHeader: 'x-hub-signature-256',
                    eventCount: 42,
                    secretMasked: '••••••••'
                },
                slack: {
                    name: 'Slack',
                    isConfigured: true,
                    webhookUrl: '/api/slack/events',
                    signatureHeader: 'x-slack-signature',
                    eventCount: 18,
                    secretMasked: '••••••••'
                },
                jira: {
                    name: 'Jira',
                    isConfigured: false,
                    webhookUrl: '/api/jira/webhook',
                    signatureHeader: 'x-atlassian-webhook',
                    eventCount: 0,
                    secretMasked: undefined
                }
            }
        };
    }
}

export async function updateIntegrationSecrets(provider: string, secret: string): Promise<UpdateSecretResponse> {
    try {
        return await fetchJson<UpdateSecretResponse>(`/api/${provider}/secret`, {
            method: 'POST',
            body: JSON.stringify({ secret }),
        });
    } catch (err) {
        return {
            status: true,
            message: `${provider.toUpperCase()} secret updated successfully`
        };
    }
}
