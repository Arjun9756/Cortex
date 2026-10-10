import React, { useState, useEffect, useRef } from 'react';
import {
    fetchIntegrationsStatus,
    getOAuthAuthorizeUrl,
    fetchRealGitHubRepos,
    fetchRealSlackChannels,
    fetchRealJiraProjects,
    saveIntegrationScope,
    syncIntegrationWebhooks,
    disconnectIntegration,
    claimIntegrationTicket,
} from './onboardingApi';
import type {
    SupportedProvider,
    ConnectorInfo,
    RealGitHubRepo,
    RealSlackChannel,
    RealJiraProject,
} from './types';
import { CortexLogo } from '../components/CortexLogo';
import { isDemoEnabled } from '../config';

interface OnboardingPageProps {
    onComplete?: () => void;
    onBackToLanding?: () => void;
}

// ─── Quota limits ────────────────────────────────────────────────────────────
const GITHUB_REPO_LIMIT = 5;
const SLACK_CHANNEL_LIMIT = 10;
const JIRA_PROJECT_LIMIT = 10;

// ─── Disconnect Confirmation Modal ───────────────────────────────────────────
interface DisconnectModalProps {
    provider: SupportedProvider;
    onConfirm: () => void;
    onCancel: () => void;
}
const DisconnectModal: React.FC<DisconnectModalProps> = ({ provider, onConfirm, onCancel }) => {
    const providerNames: Record<SupportedProvider, string> = {
        github: 'GitHub',
        slack: 'Slack',
        jira: 'Jira',
    };
    return (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f1623] border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Disconnect {providerNames[provider]}?</h3>
                        <p className="text-xs text-slate-400 mt-0.5">This will remove stored credentials and pause ingestion.</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Connecting Overlay ───────────────────────────────────────────────────────
const ConnectingOverlay: React.FC<{ provider: SupportedProvider; label: string; onCancel: () => void }> = ({ provider, label, onCancel }) => {
    const colors: Record<SupportedProvider, string> = {
        github: 'from-slate-700 to-slate-800',
        slack: 'from-[#4A154B] to-[#611a62]',
        jira: 'from-[#0052CC] to-[#0747A6]',
    };
    return (
        <div className="absolute inset-0 z-20 rounded-2xl bg-[#070b14]/92 backdrop-blur-md flex flex-col items-center justify-center gap-3.5 p-6 border border-slate-700/60 animate-in fade-in duration-200">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[provider]} border border-white/10 flex items-center justify-center shadow-lg shadow-black/40`}>
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
            </div>
            <div className="text-center">
                <p className="text-xs font-bold text-white tracking-wide">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Complete authorization in the popup window…</p>
            </div>
            <div className="flex gap-1.5 py-0.5">
                {([0, 1, 2] as const).map(i => (
                    <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
            <button
                type="button"
                onClick={onCancel}
                className="mt-1 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white text-[11px] font-semibold rounded-lg border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Cancel Authorization
            </button>
        </div>
    );
};

// ─── Skeleton Loader for resource lists ──────────────────────────────────────
const ResourceSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <div className="space-y-2">
        {Array.from({ length: rows }).map((_item, i) => (
            <div key={i} className="h-8 bg-slate-800/60 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
        ))}
    </div>
);

// ─── Save button with animated states ────────────────────────────────────────
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const SaveButton: React.FC<{
    state: SaveState;
    onClick: () => void;
    disabled?: boolean;
    count: number;
}> = ({ state, onClick, disabled, count }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled || state === 'saving'}
            className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                state === 'saved'
                    ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : state === 'error'
                    ? 'bg-rose-600/20 border border-rose-500/50 text-rose-300'
                    : state === 'saving'
                    ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white border border-indigo-500/50 shadow-md shadow-indigo-600/20'
            }`}
        >
            {state === 'saving' && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
            )}
            {state === 'saved' && (
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            )}
            {state === 'error' && <span className="text-rose-400">✕</span>}
            {state === 'saving'
                ? 'Saving Scope…'
                : state === 'saved'
                ? (count === 0 ? '✓ Scope Cleared (0 monitored)' : `✓ Scope Saved (${count} monitored)`)
                : state === 'error'
                ? 'Failed — Click to Retry'
                : count === 0
                ? 'Save Scope (Clear All / 0 selected)'
                : `Save Scope (${count} selected)`}
        </button>
    );
};

// ─── Search box ───────────────────────────────────────────────────────────────
const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
    <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-900/60 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
        />
        {value && (
            <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-0.5 cursor-pointer"
                title="Clear search"
            >
                ✕
            </button>
        )}
    </div>
);

// ─── Quota Badge ──────────────────────────────────────────────────────────────
const QuotaBadge: React.FC<{ selected: number; limit: number }> = ({ selected, limit }) => {
    const atLimit = selected >= limit;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
            atLimit ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold' : 'bg-slate-800/80 text-slate-300 border-slate-700/80'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${atLimit ? 'bg-amber-400 animate-pulse' : selected > 0 ? 'bg-indigo-400' : 'bg-slate-500'}`} />
            {selected}/{limit} selected{atLimit ? ' (max)' : ''}
        </span>
    );
};

// ─── Provider icon SVGs ───────────────────────────────────────────────────────
const GitHubIcon = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
);
const SlackIcon = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z"/>
    </svg>
);
const JiraIcon = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23 .248H11.443a5.218 5.218 0 0 0 5.214 5.217h2.129v2.054A5.22 5.22 0 0 0 24 12.735V1.249A1.001 1.001 0 0 0 23 .248z"/>
    </svg>
);

// ─── Language color map ───────────────────────────────────────────────────────
const langColor: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    'C#': '#178600',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#FA7343',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const OnboardingPage: React.FC<OnboardingPageProps> = ({
    onComplete,
    onBackToLanding,
}) => {
    const [connectors, setConnectors] = useState<Record<SupportedProvider, ConnectorInfo> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [connectingProvider, setConnectingProvider] = useState<SupportedProvider | null>(null);
    const [disconnectingProvider, setDisconnectingProvider] = useState<SupportedProvider | null>(null);
    const [confirmDisconnect, setConfirmDisconnect] = useState<SupportedProvider | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Resources
    const [githubRepos, setGithubRepos] = useState<RealGitHubRepo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
    const [slackChannels, setSlackChannels] = useState<RealSlackChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
    const [jiraProjects, setJiraProjects] = useState<RealJiraProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

    // Search
    const [repoSearch, setRepoSearch] = useState('');
    const [channelSearch, setChannelSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');

    // Scoping
    const [selectedRepos, setSelectedRepos] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('cortex_selected_repos');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [selectedChannels, setSelectedChannels] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('cortex_selected_channels');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [selectedProjects, setSelectedProjects] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('cortex_selected_projects');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    // Webhook Tunnel URL (Port Shift / Ngrok / Domain)
    const [webhookBaseUrl, setWebhookBaseUrl] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('cortex_webhook_base_url');
            if (saved) return saved;
            if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                return window.location.origin;
            }
        } catch {}
        return '';
    });

    const handleWebhookBaseUrlChange = (val: string) => {
        setWebhookBaseUrl(val);
        try {
            if (val.trim()) {
                localStorage.setItem('cortex_webhook_base_url', val.trim());
            } else {
                localStorage.removeItem('cortex_webhook_base_url');
            }
        } catch {}
    };

    // Save states
    const [githubSaveState, setGithubSaveState] = useState<SaveState>('idle');
    const [slackSaveState, setSlackSaveState] = useState<SaveState>('idle');
    const [jiraSaveState, setJiraSaveState] = useState<SaveState>('idle');

    // OAuth App Setup Modal
    const [setupModalProvider, setSetupModalProvider] = useState<SupportedProvider | null>(null);

    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const popupRef = useRef<Window | null>(null);
    const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => setToast(null), 5000);
    };

    const handleCancelConnect = (provider?: SupportedProvider) => {
        if (popupPollRef.current) {
            clearInterval(popupPollRef.current);
            popupPollRef.current = null;
        }
        if (popupRef.current && !popupRef.current.closed) {
            try {
                popupRef.current.close();
            } catch {}
        }
        popupRef.current = null;
        setConnectingProvider(null);
        showToast(provider ? `${provider.toUpperCase()} connection was cancelled.` : 'Connection cancelled.', 'info');
    };

    const parseMonitoredItems = (raw: any): string[] => {
        if (!raw) return [];
        let rules = raw;
        while (typeof rules === 'string') {
            try {
                rules = JSON.parse(rules);
            } catch {
                break;
            }
        }
        if (rules && Array.isArray(rules.monitoredItems)) {
            return rules.monitoredItems.filter((i: any) => typeof i === 'string' && i.trim() !== '' && i !== '*');
        }
        return [];
    };

    const loadStatus = async () => {
        try {
            setLoading(true);
            const statuses = await fetchIntegrationsStatus();
            setConnectors(statuses);

            if (statuses.github?.status === 'connected') {
                loadRealRepos();
                const hasExplicitRules = Boolean(statuses.github.scopeRules && typeof statuses.github.scopeRules === 'object');
                let savedRepos: string[] = [];
                if (hasExplicitRules) {
                    savedRepos = parseMonitoredItems(statuses.github.scopeRules);
                } else {
                    try {
                        const cached = localStorage.getItem('cortex_selected_repos');
                        if (cached) savedRepos = JSON.parse(cached);
                    } catch {}
                }
                const bounded = savedRepos.slice(0, GITHUB_REPO_LIMIT);
                setSelectedRepos(bounded);
                try {
                    localStorage.setItem('cortex_selected_repos', JSON.stringify(bounded));
                } catch {}
            } else {
                setSelectedRepos([]);
                try { localStorage.removeItem('cortex_selected_repos'); } catch {}
            }

            if (statuses.slack?.status === 'connected') {
                loadRealChannels();
                const hasExplicitRules = Boolean(statuses.slack.scopeRules && typeof statuses.slack.scopeRules === 'object');
                let savedChannels: string[] = [];
                if (hasExplicitRules) {
                    savedChannels = parseMonitoredItems(statuses.slack.scopeRules);
                } else {
                    try {
                        const cached = localStorage.getItem('cortex_selected_channels');
                        if (cached) savedChannels = JSON.parse(cached);
                    } catch {}
                }
                const bounded = savedChannels.slice(0, SLACK_CHANNEL_LIMIT);
                setSelectedChannels(bounded);
                try {
                    localStorage.setItem('cortex_selected_channels', JSON.stringify(bounded));
                } catch {}
            } else {
                setSelectedChannels([]);
                try { localStorage.removeItem('cortex_selected_channels'); } catch {}
            }

            if (statuses.jira?.status === 'connected') {
                loadRealProjects();
                const hasExplicitRules = Boolean(statuses.jira.scopeRules && typeof statuses.jira.scopeRules === 'object');
                let savedProjects: string[] = [];
                if (hasExplicitRules) {
                    savedProjects = parseMonitoredItems(statuses.jira.scopeRules);
                } else {
                    try {
                        const cached = localStorage.getItem('cortex_selected_projects');
                        if (cached) savedProjects = JSON.parse(cached);
                    } catch {}
                }
                const bounded = savedProjects.slice(0, JIRA_PROJECT_LIMIT);
                setSelectedProjects(bounded);
                try {
                    localStorage.setItem('cortex_selected_projects', JSON.stringify(bounded));
                } catch {}
            } else {
                setSelectedProjects([]);
                try { localStorage.removeItem('cortex_selected_projects'); } catch {}
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to connect to backend', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadRealRepos = async () => {
        try {
            setLoadingRepos(true);
            const repos = await fetchRealGitHubRepos();
            setGithubRepos(repos);
        } catch (err: any) {
            console.warn('Could not fetch GitHub repos:', err?.message);
        } finally {
            setLoadingRepos(false);
        }
    };

    const loadRealChannels = async () => {
        try {
            setLoadingChannels(true);
            const channels = await fetchRealSlackChannels();
            setSlackChannels(channels);
        } catch (err: any) {
            console.warn('Could not fetch Slack channels:', err?.message);
        } finally {
            setLoadingChannels(false);
        }
    };

    const loadRealProjects = async () => {
        try {
            setLoadingProjects(true);
            const projects = await fetchRealJiraProjects();
            setJiraProjects(projects);
        } catch (err: any) {
            console.warn('Could not fetch Jira projects:', err?.message);
        } finally {
            setLoadingProjects(false);
        }
    };

    useEffect(() => {
        loadStatus();

        const urlParams = new URLSearchParams(window.location.search);
        const claimTicket = urlParams.get('claim_ticket');
        const claimProvider = urlParams.get('provider') as SupportedProvider | null;
        if (claimTicket && claimProvider) {
            claimIntegrationTicket(claimProvider, claimTicket)
                .then(() => {
                    showToast(`✓ ${claimProvider.toUpperCase()} connected!`, 'success');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    loadStatus();
                })
                .catch((e: any) => showToast(e?.message || 'Failed to claim token', 'error'));
        }

        const handleMessage = async (event: MessageEvent) => {
            if (popupPollRef.current) {
                clearInterval(popupPollRef.current);
                popupPollRef.current = null;
            }
            if (popupRef.current && !popupRef.current.closed) {
                try { popupRef.current.close(); } catch {}
            }
            popupRef.current = null;

            if (event.data?.type === 'CORTEX_OAUTH_TICKET') {
                const provider = event.data?.provider as SupportedProvider;
                const ticket = event.data?.ticket as string;
                try {
                    showToast(`Finalizing ${provider.toUpperCase()} connection…`, 'info');
                    await claimIntegrationTicket(provider, ticket);
                    showToast(`✓ ${provider.toUpperCase()} connected!`, 'success');
                    setConnectingProvider(null);
                    await loadStatus();
                } catch (cErr: any) {
                    showToast(cErr?.message || 'Authorization failed', 'error');
                    setConnectingProvider(null);
                }
            } else if (event.data?.type === 'CORTEX_OAUTH_SUCCESS') {
                const provider = event.data?.provider as SupportedProvider;
                showToast(`✓ ${provider.toUpperCase()} connected!`, 'success');
                setConnectingProvider(null);
                loadStatus();
            } else if (event.data?.type === 'CORTEX_OAUTH_ERROR') {
                showToast(event.data?.error || 'OAuth cancelled or failed', 'error');
                setConnectingProvider(null);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
            if (popupPollRef.current) {
                clearInterval(popupPollRef.current);
                popupPollRef.current = null;
            }
        };
    }, []);

    const handleConnect = async (provider: SupportedProvider) => {
        // Clean up previous attempts if any
        if (popupPollRef.current) {
            clearInterval(popupPollRef.current);
            popupPollRef.current = null;
        }
        if (popupRef.current && !popupRef.current.closed) {
            try { popupRef.current.close(); } catch {}
        }
        popupRef.current = null;

        setConnectingProvider(provider);
        try {
            const { url } = await getOAuthAuthorizeUrl(provider);
            const width = 640, height = 750;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            const popup = window.open(
                url,
                `cortex-oauth-${provider}`,
                `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
            );
            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                window.location.href = url;
                return;
            }

            popup.focus();
            popupRef.current = popup;

            // Poll popup.closed every 500ms to immediately detect if user closed the window
            popupPollRef.current = setInterval(() => {
                if (popup.closed) {
                    if (popupPollRef.current) {
                        clearInterval(popupPollRef.current);
                        popupPollRef.current = null;
                    }
                    popupRef.current = null;
                    setConnectingProvider(prev => {
                        if (prev === provider) {
                            showToast(`${provider.toUpperCase()} window closed — connection cancelled.`, 'info');
                            return null;
                        }
                        return prev;
                    });
                }
            }, 500);
        } catch (err: any) {
            setConnectingProvider(null);
            if (err.requiresRegistration) {
                setSetupModalProvider(provider);
            } else {
                showToast(err.message || `Failed to initiate ${provider} OAuth`, 'error');
            }
        }
    };

    const handleDisconnect = async (provider: SupportedProvider) => {
        setConfirmDisconnect(null);
        setDisconnectingProvider(provider);
        try {
            await disconnectIntegration(provider);
            showToast(`${provider.toUpperCase()} disconnected.`, 'info');
            await loadStatus();
            // Reset resource lists and scoping for this provider
            if (provider === 'github') {
                setGithubRepos([]);
                setSelectedRepos([]);
                try { localStorage.removeItem('cortex_selected_repos'); } catch {}
            }
            if (provider === 'slack') {
                setSlackChannels([]);
                setSelectedChannels([]);
                try { localStorage.removeItem('cortex_selected_channels'); } catch {}
            }
            if (provider === 'jira') {
                setJiraProjects([]);
                setSelectedProjects([]);
                try { localStorage.removeItem('cortex_selected_projects'); } catch {}
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to disconnect', 'error');
        } finally {
            setDisconnectingProvider(null);
        }
    };

    const handleSaveGithubScope = async () => {
        setGithubSaveState('saving');
        try {
            const res = await saveIntegrationScope('github', {
                allMonitored: false,
                monitoredItems: selectedRepos,
            }, webhookBaseUrl.trim() || undefined);
            try {
                localStorage.setItem('cortex_selected_repos', JSON.stringify(selectedRepos));
            } catch {}
            setConnectors(prev => prev ? {
                ...prev,
                github: {
                    ...prev.github,
                    scopeRules: { allMonitored: false, monitoredItems: selectedRepos },
                    webhookRegistered: selectedRepos.length > 0 && res.webhookSync?.status === 'installed' ? true : (selectedRepos.length === 0 ? false : prev.github.webhookRegistered),
                }
            } : prev);
            setGithubSaveState('saved');
            if (selectedRepos.length === 0) {
                showToast(`GitHub scope cleared (0 repositories monitored — monitoring paused).`, 'info');
            } else if (res.webhookSync?.status === 'installed') {
                showToast(`GitHub scope saved & webhook auto-installed for ${selectedRepos.length} repository(ies).`, 'success');
            } else if (res.webhookSync?.status === 'skipped_localhost') {
                showToast(`Scope saved. Enter your Public Tunnel URL above to auto-install on GitHub.`, 'info');
            } else {
                showToast(`GitHub scope saved (${selectedRepos.length} repositories monitored).`, 'success');
            }
            setTimeout(() => setGithubSaveState('idle'), 3000);
        } catch (err: any) {
            setGithubSaveState('error');
            setTimeout(() => setGithubSaveState('idle'), 2500);
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const handleSaveSlackScope = async () => {
        setSlackSaveState('saving');
        try {
            const res = await saveIntegrationScope('slack', {
                allMonitored: false,
                monitoredItems: selectedChannels,
            }, webhookBaseUrl.trim() || undefined);
            try {
                localStorage.setItem('cortex_selected_channels', JSON.stringify(selectedChannels));
            } catch {}
            setConnectors(prev => prev ? {
                ...prev,
                slack: {
                    ...prev.slack,
                    scopeRules: { allMonitored: false, monitoredItems: selectedChannels },
                    webhookRegistered: selectedChannels.length > 0 && res.webhookSync?.status === 'channels_joined' ? true : (selectedChannels.length === 0 ? false : prev.slack.webhookRegistered),
                }
            } : prev);
            setSlackSaveState('saved');
            if (selectedChannels.length === 0) {
                showToast(`Slack scope cleared (0 channels monitored — bot paused).`, 'info');
            } else if (res.webhookSync?.status === 'channels_joined') {
                showToast(`Slack scope saved & bot joined ${selectedChannels.length} channel(s).`, 'success');
            } else {
                showToast(`Slack scope saved (${selectedChannels.length} channels monitored).`, 'success');
            }
            setTimeout(() => setSlackSaveState('idle'), 3000);
        } catch (err: any) {
            setSlackSaveState('error');
            setTimeout(() => setSlackSaveState('idle'), 2500);
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const handleSaveJiraScope = async () => {
        setJiraSaveState('saving');
        try {
            const res = await saveIntegrationScope('jira', {
                allMonitored: false,
                monitoredItems: selectedProjects,
            }, webhookBaseUrl.trim() || undefined);
            try {
                localStorage.setItem('cortex_selected_projects', JSON.stringify(selectedProjects));
            } catch {}
            setConnectors(prev => prev ? {
                ...prev,
                jira: {
                    ...prev.jira,
                    scopeRules: { allMonitored: false, monitoredItems: selectedProjects },
                    webhookRegistered: selectedProjects.length > 0 && res.webhookSync?.status === 'installed' ? true : (selectedProjects.length === 0 ? false : prev.jira.webhookRegistered),
                }
            } : prev);
            setJiraSaveState('saved');
            if (selectedProjects.length === 0) {
                showToast(`Jira scope cleared (0 projects monitored — monitoring paused).`, 'info');
            } else if (res.webhookSync?.status === 'installed') {
                showToast(`Jira scope saved & dynamic webhook registered.`, 'success');
            } else if (res.webhookSync?.status === 'skipped_localhost') {
                showToast(`Scope saved. Enter your Public Tunnel URL above to auto-register Jira webhooks.`, 'info');
            } else {
                showToast(`Jira scope saved (${selectedProjects.length} projects monitored).`, 'success');
            }
            setTimeout(() => setJiraSaveState('idle'), 3000);
        } catch (err: any) {
            setJiraSaveState('error');
            setTimeout(() => setJiraSaveState('idle'), 2500);
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const handleSyncWebhooks = async (provider: SupportedProvider) => {
        try {
            showToast(`Syncing ${provider.toUpperCase()} webhooks…`, 'info');
            const res = await syncIntegrationWebhooks(provider, webhookBaseUrl.trim() || undefined);
            if (res.webhookSync?.status === 'installed' || res.webhookSync?.status === 'channels_joined') {
                showToast(`✓ ${res.webhookSync.message}`, 'success');
                setConnectors(prev => prev ? {
                    ...prev,
                    [provider]: {
                        ...prev[provider],
                        webhookRegistered: true,
                    }
                } : prev);
            } else if (res.webhookSync?.status === 'skipped_localhost') {
                showToast(res.webhookSync.message, 'info');
            } else {
                showToast(res.webhookSync?.message || 'Sync complete', 'info');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to sync webhooks', 'error');
        }
    };

    const hasAnyConnected = connectors && Object.values(connectors).some(c => c.status === 'connected');
    const connectedCount = connectors ? Object.values(connectors).filter(c => c.status === 'connected').length : 0;

    // ── Filtered resources ─────────────────────────────────────────────────────
    const filteredRepos = githubRepos.filter(r =>
        r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(repoSearch.toLowerCase())
    );
    const filteredChannels = slackChannels.filter(c =>
        c.name.toLowerCase().includes(channelSearch.toLowerCase())
    );
    const filteredProjects = jiraProjects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.key.toLowerCase().includes(projectSearch.toLowerCase())
    );

    // ── Toggle helpers with quota enforcement ──────────────────────────────────
    const toggleRepo = (repo: RealGitHubRepo) => {
        const isSelected = selectedRepos.some(r => r === repo.name || r === repo.fullName);
        if (isSelected) {
            setSelectedRepos(prev => {
                const next = prev.filter(r => r !== repo.name && r !== repo.fullName);
                try { localStorage.setItem('cortex_selected_repos', JSON.stringify(next)); } catch {}
                return next;
            });
        } else {
            if (selectedRepos.length >= GITHUB_REPO_LIMIT) {
                showToast(`Free tier is limited to ${GITHUB_REPO_LIMIT} repositories.`, 'error');
                return;
            }
            const idToSave = repo.fullName || repo.name;
            setSelectedRepos(prev => {
                const next = [...prev, idToSave];
                try { localStorage.setItem('cortex_selected_repos', JSON.stringify(next)); } catch {}
                return next;
            });
        }
        if (githubSaveState !== 'idle') setGithubSaveState('idle');
    };
    const toggleChannel = (ch: RealSlackChannel) => {
        const isSelected = selectedChannels.some(c => c === ch.name || c === ch.id);
        if (isSelected) {
            setSelectedChannels(prev => {
                const next = prev.filter(c => c !== ch.name && c !== ch.id);
                try { localStorage.setItem('cortex_selected_channels', JSON.stringify(next)); } catch {}
                return next;
            });
        } else {
            if (selectedChannels.length >= SLACK_CHANNEL_LIMIT) {
                showToast(`Free tier is limited to ${SLACK_CHANNEL_LIMIT} channels.`, 'error');
                return;
            }
            setSelectedChannels(prev => {
                const next = [...prev, ch.name];
                try { localStorage.setItem('cortex_selected_channels', JSON.stringify(next)); } catch {}
                return next;
            });
        }
        if (slackSaveState !== 'idle') setSlackSaveState('idle');
    };
    const toggleProject = (proj: RealJiraProject) => {
        const isSelected = selectedProjects.some(p => p === proj.key || p === proj.name || p === proj.id);
        if (isSelected) {
            setSelectedProjects(prev => {
                const next = prev.filter(p => p !== proj.key && p !== proj.name && p !== proj.id);
                try { localStorage.setItem('cortex_selected_projects', JSON.stringify(next)); } catch {}
                return next;
            });
        } else {
            if (selectedProjects.length >= JIRA_PROJECT_LIMIT) {
                showToast(`Free tier is limited to ${JIRA_PROJECT_LIMIT} projects.`, 'error');
                return;
            }
            setSelectedProjects(prev => {
                const next = [...prev, proj.key];
                try { localStorage.setItem('cortex_selected_projects', JSON.stringify(next)); } catch {}
                return next;
            });
        }
        if (jiraSaveState !== 'idle') setJiraSaveState('idle');
    };

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6">
                <CortexLogo className="w-12 h-12 mb-5" />
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-slate-400">Checking connection status…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between bg-[#070b14]/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <CortexLogo className="w-8 h-8" />
                    <div>
                        <span className="font-bold text-white text-sm tracking-tight">Cortex</span>
                        <span className="text-[10px] font-mono uppercase text-slate-500 ml-2">/ Connect Tools</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Step progress */}
                    <div className="hidden sm:flex items-center gap-1.5">
                        {(['github', 'slack', 'jira'] as SupportedProvider[]).map((p, i) => {
                            const isConnected = connectors?.[p]?.status === 'connected';
                            return (
                                <div key={p} className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center transition-all ${
                                        isConnected
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-500'
                                    }`}>
                                        {isConnected ? '✓' : i + 1}
                                    </div>
                                    {i < 2 && <div className={`w-6 h-px ${isConnected ? 'bg-emerald-500/30' : 'bg-slate-700'}`} />}
                                </div>
                            );
                        })}
                        <span className="text-[11px] text-slate-500 ml-2 font-mono">{connectedCount}/3 connected</span>
                    </div>
                    {onBackToLanding && (
                        <button
                            onClick={onBackToLanding}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                            Back
                        </button>
                    )}
                </div>
            </header>

            {/* ── Toast ── */}
            <div className="fixed top-20 right-4 z-50 pointer-events-none">
                {toast && (
                    <div
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-xs font-medium max-w-xs transition-all duration-300 ${
                            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10' :
                            toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-300 shadow-rose-500/10' :
                            'bg-indigo-950/90 border-indigo-500/30 text-indigo-300 shadow-indigo-500/10'
                        }`}
                    >
                        <span className="text-xs font-mono font-bold">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'i'}</span>
                        <span className="flex-1">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 cursor-pointer ml-1">✕</button>
                    </div>
                )}
            </div>

            {/* ── Main content ── */}
            <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">

                {/* Page title */}
                <div className="text-center max-w-xl mx-auto mb-10">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                        Connect your engineering tools
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Authorize Cortex via official OAuth. Your data stays in your VPC — we never store source code.
                    </p>
                </div>

                {/* ── Webhook Auto-Deployment & Tunnel Settings ── */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-8 backdrop-blur-sm shadow-xl shadow-black/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xs font-bold text-white tracking-wide uppercase">Automated Webhook Deployment</h3>
                                    {webhookBaseUrl && !webhookBaseUrl.includes('localhost') && !webhookBaseUrl.includes('127.0.0.1') ? (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Public Tunnel Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                                            Localhost Mode (Tunnel Recommended)
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    When you select and save repos or channels, Cortex automatically installs webhooks on their servers so push, PR, and message events stream live.
                                </p>
                            </div>
                        </div>

                        {/* Public URL Input */}
                        <div className="flex flex-col gap-1 sm:w-80 shrink-0">
                            <span className="text-[10px] text-slate-400 font-medium">Public Webhook URL (Port Shift / Tunnel):</span>
                            <input
                                type="text"
                                value={webhookBaseUrl}
                                onChange={e => handleWebhookBaseUrlChange(e.target.value)}
                                placeholder="https://your-tunnel.portshift.io"
                                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Provider cards ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">

                    {/* ──────── GITHUB CARD ──────── */}
                    {(() => {
                        const isConnected = connectors?.github?.status === 'connected';
                        const isConnecting = connectingProvider === 'github';
                        const isDisconnecting = disconnectingProvider === 'github';
                        const info = connectors?.github;

                        return (
                            <div className={`relative bg-[#0c1222] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[500px] ${
                                isConnected ? 'border-emerald-500/40 shadow-xl shadow-emerald-500/5' :
                                info?.status === 'needs_reauth' ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' :
                                'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-black/30'
                            }`}>
                                {/* Connecting overlay */}
                                {isConnecting && (
                                    <ConnectingOverlay 
                                        provider="github" 
                                        label="Opening GitHub OAuth…" 
                                        onCancel={() => handleCancelConnect('github')} 
                                    />
                                )}

                                <div className="space-y-3">
                                    {/* Provider header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0">
                                                <GitHubIcon />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">GitHub</h3>
                                                <p className="text-[11px] text-slate-500">Repositories & PRs</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                            isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            info?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : info?.status === 'needs_reauth' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                            {isConnected ? 'Connected' : info?.status === 'needs_reauth' ? 'Needs Re-auth' : 'Not connected'}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Ingest commit attribution, PR lifecycles, branch ownership, and co-author graphs into your Knowledge Graph.
                                    </p>

                                    {/* Connected account pill */}
                                    {isConnected && info && (
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                            {info.accountAvatar ? (
                                                <img src={info.accountAvatar} alt="" className="w-7 h-7 rounded-full border border-slate-700 shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs shrink-0">
                                                    <GitHubIcon />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-200 truncate">{info.accountName || 'Authorized Account'}</p>
                                                {info.accountEmail && <p className="text-[10px] text-slate-500 truncate">{info.accountEmail}</p>}
                                            </div>
                                            <button
                                                onClick={() => setConfirmDisconnect('github')}
                                                disabled={isDisconnecting}
                                                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 px-2 py-1 rounded hover:bg-rose-500/10 disabled:opacity-50"
                                            >
                                                {isDisconnecting ? '…' : 'Disconnect'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Scoping section (if connected) OR Capabilities list (if not connected) */}
                                {isConnected ? (
                                    <div className="border-t border-slate-800/60 pt-3 my-2 space-y-2 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-200">Repository Scope</span>
                                            <div className="flex items-center gap-2">
                                                {selectedRepos.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedRepos([]); setGithubSaveState('idle'); }}
                                                        className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                                <QuotaBadge selected={selectedRepos.length} limit={GITHUB_REPO_LIMIT} />
                                            </div>
                                        </div>
                                        <SearchBox value={repoSearch} onChange={setRepoSearch} placeholder="Search repos…" />
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2">
                                            {loadingRepos ? (
                                                <div className="p-2"><ResourceSkeleton rows={3} /></div>
                                            ) : filteredRepos.length === 0 ? (
                                                <div className="text-center py-4 text-xs text-slate-500">
                                                    {repoSearch ? 'No repos match your search.' : 'No repositories found.'}
                                                </div>
                                            ) : (
                                                filteredRepos.map(repo => {
                                                    const checked = selectedRepos.some(r => r === repo.name || r === repo.fullName);
                                                    const atLimit = !checked && selectedRepos.length >= GITHUB_REPO_LIMIT;
                                                    return (
                                                        <label
                                                            key={repo.id}
                                                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                                                checked ? 'bg-indigo-600/10 border border-indigo-500/30 shadow-sm' :
                                                                atLimit ? 'opacity-40 cursor-not-allowed hover:bg-transparent' :
                                                                'hover:bg-slate-800/60 border border-slate-800/40 hover:border-slate-700/60'
                                                            }`}
                                                            onClick={e => { e.preventDefault(); if (!atLimit) toggleRepo(repo); }}
                                                        >
                                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>
                                                                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-xs text-slate-200 truncate font-semibold">{repo.fullName}</span>
                                                                    {repo.isPrivate ? (
                                                                        <span className="text-[9px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0 font-mono">Private</span>
                                                                    ) : (
                                                                        <span className="text-[9px] bg-slate-800/50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700/40 shrink-0 font-mono">Public</span>
                                                                    )}
                                                                </div>
                                                                {repo.description && (
                                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{repo.description}</p>
                                                                )}
                                                                {repo.language && (
                                                                    <span className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor[repo.language] ?? '#94a3b8' }} />
                                                                        {repo.language}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <SaveButton state={githubSaveState} onClick={handleSaveGithubScope} disabled={!isConnected} count={selectedRepos.length} />
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5 my-auto space-y-2.5">
                                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">Capabilities & Lineage</span>
                                        <div className="space-y-2 text-xs text-slate-300">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Commit lineage &amp; co-author knowledge graphs</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Bus factor &amp; single point of failure alerts</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Real-time webhook sync on pushes &amp; PR events</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                                            Read-only metadata &bull; Zero code stored &bull; VPC isolated
                                        </div>
                                    </div>
                                )}

                                {/* Bottom section: Status & Action */}
                                <div className="mt-3 pt-3 border-t border-slate-800/60">
                                    {isConnected ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[11px]">
                                                {info?.webhookRegistered ? (
                                                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Webhook Active
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        Auto-installs on save
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleSyncWebhooks('github')}
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                                >
                                                    Sync Webhook
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 py-2 rounded-xl font-medium">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                OAuth authenticated
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect('github')}
                                            disabled={isConnecting || !!connectingProvider}
                                            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                                    Opening GitHub…
                                                </>
                                            ) : (
                                                <>
                                                    <GitHubIcon />
                                                    Connect GitHub
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ──────── SLACK CARD ──────── */}
                    {(() => {
                        const isConnected = connectors?.slack?.status === 'connected';
                        const isConnecting = connectingProvider === 'slack';
                        const isDisconnecting = disconnectingProvider === 'slack';
                        const info = connectors?.slack;

                        return (
                            <div className={`relative bg-[#0c1222] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[500px] ${
                                isConnected ? 'border-emerald-500/40 shadow-xl shadow-emerald-500/5' :
                                info?.status === 'needs_reauth' ? 'border-amber-500/30' :
                                'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-black/30'
                            }`}>
                                {isConnecting && (
                                    <ConnectingOverlay 
                                        provider="slack" 
                                        label="Opening Slack OAuth…" 
                                        onCancel={() => handleCancelConnect('slack')} 
                                    />
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#4A154B]/30 border border-[#e01e5a]/20 flex items-center justify-center text-[#e01e5a] shrink-0">
                                                <SlackIcon />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">Slack</h3>
                                                <p className="text-[11px] text-slate-500">Channels & Teams</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                            isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            info?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : info?.status === 'needs_reauth' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                            {isConnected ? 'Connected' : info?.status === 'needs_reauth' ? 'Needs Re-auth' : 'Not connected'}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Correlate engineer identities, architectural decisions, and cross-team knowledge sharing from Slack threads.
                                    </p>

                                    {isConnected && info && (
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-[#4A154B]/40 border border-[#e01e5a]/20 flex items-center justify-center text-[#e01e5a] shrink-0 text-xs">
                                                <SlackIcon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-200 truncate">{info.accountName || 'Slack Workspace'}</p>
                                                <p className="text-[10px] text-slate-500">Workspace connected</p>
                                            </div>
                                            <button
                                                onClick={() => setConfirmDisconnect('slack')}
                                                disabled={isDisconnecting}
                                                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 px-2 py-1 rounded hover:bg-rose-500/10 disabled:opacity-50"
                                            >
                                                {isDisconnecting ? '…' : 'Disconnect'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isConnected ? (
                                    <div className="border-t border-slate-800/60 pt-3 my-2 space-y-2 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-200">Channel Scope</span>
                                            <div className="flex items-center gap-2">
                                                {selectedChannels.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedChannels([]); setSlackSaveState('idle'); }}
                                                        className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                                <QuotaBadge selected={selectedChannels.length} limit={SLACK_CHANNEL_LIMIT} />
                                            </div>
                                        </div>
                                        <SearchBox value={channelSearch} onChange={setChannelSearch} placeholder="Search channels…" />
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2">
                                            {loadingChannels ? (
                                                <div className="p-2"><ResourceSkeleton rows={3} /></div>
                                            ) : filteredChannels.length === 0 ? (
                                                <div className="text-center py-4 text-xs text-slate-500">
                                                    {channelSearch ? 'No channels match your search.' : 'No accessible channels found.'}
                                                </div>
                                            ) : (
                                                filteredChannels.map(ch => {
                                                    const checked = selectedChannels.some(c => c === ch.name || c === ch.id);
                                                    const atLimit = !checked && selectedChannels.length >= SLACK_CHANNEL_LIMIT;
                                                    return (
                                                        <label
                                                            key={ch.id}
                                                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                                                checked ? 'bg-indigo-600/10 border border-indigo-500/30 shadow-sm' :
                                                                atLimit ? 'opacity-40 cursor-not-allowed hover:bg-transparent' :
                                                                'hover:bg-slate-800/60 border border-slate-800/40 hover:border-slate-700/60'
                                                            }`}
                                                            onClick={e => { e.preventDefault(); if (!atLimit) toggleChannel(ch); }}
                                                        >
                                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>
                                                                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs text-slate-200 font-semibold truncate">#{ch.name}</span>
                                                                    {ch.isPrivate && (
                                                                        <span className="text-[9px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0 font-mono">Private</span>
                                                                    )}
                                                                    {ch.memberCount > 0 && (
                                                                        <span className="text-[10px] text-slate-500 font-mono ml-auto shrink-0">{ch.memberCount} members</span>
                                                                    )}
                                                                </div>
                                                                {ch.topic && (
                                                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{ch.topic}</p>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <SaveButton state={slackSaveState} onClick={handleSaveSlackScope} disabled={!isConnected} count={selectedChannels.length} />
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5 my-auto space-y-2.5">
                                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">Capabilities & Lineage</span>
                                        <div className="space-y-2 text-xs text-slate-300">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#e01e5a] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Technical discussion &amp; architectural thread context</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#e01e5a] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Cross-team collaboration &amp; mentor graph mapping</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#e01e5a] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Scoped channel access &amp; zero private DM ingestion</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                                            Granular channel scope &bull; No DM access &bull; VPC isolated
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t border-slate-800/60">
                                    {isConnected ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[11px]">
                                                {info?.webhookRegistered ? (
                                                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Slack Bot in Scoped Channels
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        Bot auto-joins on save
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleSyncWebhooks('slack')}
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                                >
                                                    Sync Channels
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 py-2 rounded-xl font-medium">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                OAuth authenticated
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect('slack')}
                                            disabled={isConnecting || !!connectingProvider}
                                            className="w-full py-2.5 px-4 bg-[#4A154B] hover:bg-[#611a62] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#4A154B]/20 border border-[#e01e5a]/20"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                                    Opening Slack…
                                                </>
                                            ) : (
                                                <>
                                                    <SlackIcon />
                                                    Connect Slack
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ──────── JIRA CARD ──────── */}
                    {(() => {
                        const isConnected = connectors?.jira?.status === 'connected';
                        const isConnecting = connectingProvider === 'jira';
                        const isDisconnecting = disconnectingProvider === 'jira';
                        const info = connectors?.jira;

                        return (
                            <div className={`relative bg-[#0c1222] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 min-h-[500px] ${
                                isConnected ? 'border-emerald-500/40 shadow-xl shadow-emerald-500/5' :
                                info?.status === 'needs_reauth' ? 'border-amber-500/30' :
                                'border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-black/30'
                            }`}>
                                {isConnecting && (
                                    <ConnectingOverlay 
                                        provider="jira" 
                                        label="Opening Atlassian OAuth…" 
                                        onCancel={() => handleCancelConnect('jira')} 
                                    />
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#0052CC]/20 border border-[#2684FF]/20 flex items-center justify-center text-[#2684FF] shrink-0">
                                                <JiraIcon />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">Jira</h3>
                                                <p className="text-[11px] text-slate-500">Projects & Sprints</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                            isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            info?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : info?.status === 'needs_reauth' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                            {isConnected ? 'Connected' : info?.status === 'needs_reauth' ? 'Needs Re-auth' : 'Not connected'}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Ingest sprint velocity, ticket reassignments, pending workloads, and issue resolution lead times.
                                    </p>

                                    {isConnected && info && (
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-[#0052CC]/20 border border-[#2684FF]/20 flex items-center justify-center text-[#2684FF] shrink-0 text-xs">
                                                <JiraIcon />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-200 truncate">{info.accountName || 'Atlassian Cloud'}</p>
                                                <p className="text-[10px] text-slate-500">Atlassian Cloud connected</p>
                                            </div>
                                            <button
                                                onClick={() => setConfirmDisconnect('jira')}
                                                disabled={isDisconnecting}
                                                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 px-2 py-1 rounded hover:bg-rose-500/10 disabled:opacity-50"
                                            >
                                                {isDisconnecting ? '…' : 'Disconnect'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isConnected ? (
                                    <div className="border-t border-slate-800/60 pt-3 my-2 space-y-2 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-200">Project Scope</span>
                                            <div className="flex items-center gap-2">
                                                {selectedProjects.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedProjects([]); setJiraSaveState('idle'); }}
                                                        className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                                <QuotaBadge selected={selectedProjects.length} limit={JIRA_PROJECT_LIMIT} />
                                            </div>
                                        </div>
                                        <SearchBox value={projectSearch} onChange={setProjectSearch} placeholder="Search projects…" />
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2">
                                            {loadingProjects ? (
                                                <div className="p-2"><ResourceSkeleton rows={3} /></div>
                                            ) : filteredProjects.length === 0 ? (
                                                <div className="text-center py-4 text-xs text-slate-500">
                                                    {projectSearch ? 'No projects match your search.' : 'No Jira projects found.'}
                                                </div>
                                            ) : (
                                                filteredProjects.map(proj => {
                                                    const checked = selectedProjects.some(p => p === proj.key || p === proj.name || p === proj.id);
                                                    const atLimit = !checked && selectedProjects.length >= JIRA_PROJECT_LIMIT;
                                                    return (
                                                        <label
                                                            key={proj.id}
                                                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                                                checked ? 'bg-indigo-600/10 border border-indigo-500/30 shadow-sm' :
                                                                atLimit ? 'opacity-40 cursor-not-allowed hover:bg-transparent' :
                                                                'hover:bg-slate-800/60 border border-slate-800/40 hover:border-slate-700/60'
                                                            }`}
                                                            onClick={e => { e.preventDefault(); if (!atLimit) toggleProject(proj); }}
                                                        >
                                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-700'}`}>
                                                                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                                {proj.avatarUrl ? (
                                                                    <img src={proj.avatarUrl} alt="" className="w-4 h-4 rounded shrink-0" />
                                                                ) : (
                                                                    <span className="w-4 h-4 rounded bg-[#0052CC]/20 text-[#2684FF] text-[9px] flex items-center justify-center font-bold">J</span>
                                                                )}
                                                                <span className="font-mono text-[10px] bg-[#0052CC]/20 text-[#2684FF] px-1.5 py-0.5 rounded border border-[#2684FF]/20 shrink-0 font-bold">{proj.key}</span>
                                                                <span className="text-xs text-slate-200 truncate font-semibold">{proj.name}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <SaveButton state={jiraSaveState} onClick={handleSaveJiraScope} disabled={!isConnected} count={selectedProjects.length} />
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5 my-auto space-y-2.5">
                                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">Capabilities & Lineage</span>
                                        <div className="space-y-2 text-xs text-slate-300">
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#2684FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Sprint velocity &amp; workload distribution tracking</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#2684FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Ticket reassignment &amp; knowledge loss prevention</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-[#2684FF] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                <span className="leading-tight">Bi-directional webhook sync on project issue events</span>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/40">
                                            Project-level scoping &bull; Atlassian Cloud &bull; VPC isolated
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t border-slate-800/60">
                                    {isConnected ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[11px]">
                                                {info?.webhookRegistered ? (
                                                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                        Jira Dynamic Webhook Active
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                        Webhook auto-installs on save
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleSyncWebhooks('jira')}
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                                >
                                                    Sync Webhook
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 py-2 rounded-xl font-medium">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                OAuth authenticated
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect('jira')}
                                            disabled={isConnecting || !!connectingProvider}
                                            className="w-full py-2.5 px-4 bg-[#0052CC] hover:bg-[#0747A6] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 border border-[#2684FF]/20"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                                                    Opening Atlassian…
                                                </>
                                            ) : (
                                                <>
                                                    <JiraIcon />
                                                    Connect Jira
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ── CTA ── */}
                <div className="flex flex-col items-center gap-4 py-4 w-full">
                    {hasAnyConnected ? (
                        <button
                            onClick={onComplete}
                            className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-2xl shadow-indigo-600/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 sm:gap-3 active:scale-[0.99]"
                        >
                            <CortexLogo className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Proceed to Executive Dashboard</span>
                            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                        </button>
                    ) : (
                        <div className="text-center space-y-2">
                            <p className="text-xs text-slate-400">Connect at least one tool above to start analyzing your team's Knowledge Graph.</p>
                            {isDemoEnabled && (
                                <button
                                    onClick={onComplete}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium hover:underline"
                                >
                                    Or explore executive dashboard with sample data →
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-[11px] text-slate-600 font-mono">
                        Zero code egress · Tokens encrypted at rest · Air-gap ready
                    </p>
                </div>
            </main>

            {/* ── Confirm Disconnect Modal ── */}
            {confirmDisconnect && (
                <DisconnectModal
                    provider={confirmDisconnect}
                    onConfirm={() => handleDisconnect(confirmDisconnect)}
                    onCancel={() => setConfirmDisconnect(null)}
                />
            )}

            {/* ── OAuth App Registration Modal ── */}
            {setupModalProvider && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0f1623] border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Register {setupModalProvider.charAt(0).toUpperCase() + setupModalProvider.slice(1)} OAuth App
                            </h3>
                            <button onClick={() => setSetupModalProvider(null)} className="text-slate-400 hover:text-white cursor-pointer w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-xs">✕</button>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            An OAuth App must be registered in the provider's developer portal before real OAuth can work. This is a one-time setup.
                        </p>

                        <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                            <div>
                                <span className="text-slate-400 font-medium block mb-1.5">1. Developer Portal</span>
                                {setupModalProvider === 'github' && (
                                    <a href="https://github.com/settings/applications/new" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-mono">
                                        github.com/settings/applications/new ↗
                                    </a>
                                )}
                                {setupModalProvider === 'slack' && (
                                    <a href="https://api.slack.com/apps?new_app=1" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-mono">
                                        api.slack.com/apps?new_app=1 ↗
                                    </a>
                                )}
                                {setupModalProvider === 'jira' && (
                                    <a href="https://developer.atlassian.com/console/myapps/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono">
                                        developer.atlassian.com/console/myapps/ ↗
                                    </a>
                                )}
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1.5">2. Callback URL</span>
                                <code className="block bg-slate-900 p-2 rounded-lg text-emerald-400 font-mono text-[11px] select-all border border-slate-800">
                                    http://localhost:3000/api/integrations/{setupModalProvider}/callback
                                </code>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1.5">3. Required Scopes</span>
                                <code className="block bg-slate-900 p-2 rounded-lg text-amber-300 font-mono text-[11px] border border-slate-800">
                                    {setupModalProvider === 'github' && 'repo, read:org, user:email, read:user'}
                                    {setupModalProvider === 'slack' && 'channels:read, groups:read, users:read, users:read.email, team:read'}
                                    {setupModalProvider === 'jira' && 'read:jira-work, read:jira-user, offline_access, read:me'}
                                </code>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1.5">4. Add to .env</span>
                                <pre className="bg-slate-900 p-3 rounded-lg text-indigo-300 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
{setupModalProvider === 'github' && `GITHUB_CLIENT_ID=your_client_id\nGITHUB_CLIENT_SECRET=your_client_secret`}
{setupModalProvider === 'slack' && `SLACK_CLIENT_ID=your_client_id\nSLACK_CLIENT_SECRET=your_client_secret`}
{setupModalProvider === 'jira' && `JIRA_CLIENT_ID=your_client_id\nJIRA_CLIENT_SECRET=your_client_secret`}
                                </pre>
                            </div>

                            <div className="pt-1">
                                <span className="text-slate-400 font-medium block mb-1.5">5. App Icon & Branding (512x512 PNG)</span>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <img src="/cortex-app-icon-512.png" alt="Cortex Icon" className="w-10 h-10 rounded-lg border border-slate-700/60 object-cover bg-[#0B0F15]" />
                                        <div>
                                            <p className="text-slate-200 font-medium text-xs">Official Cortex App Icon</p>
                                            <p className="text-slate-500 text-[10px]">Optimized 512x512 PNG for Slack, GitHub & Jira portals</p>
                                        </div>
                                    </div>
                                    <a
                                        href="/cortex-app-icon-512.png"
                                        download={`cortex-${setupModalProvider}-app-icon.png`}
                                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                        Download Logo
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                onClick={() => setSetupModalProvider(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => { setSetupModalProvider(null); handleConnect(setupModalProvider); }}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Footer ── */}
            <footer className="border-t border-slate-800/60 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <CortexLogo className="w-5 h-5" />
                    <span className="text-[11px] text-slate-600 font-mono">Cortex Intelligence Platform</span>
                </div>
                <span className="text-[11px] text-slate-600 font-mono">Zero-trust BYOC · Tokens encrypted in local PostgreSQL</span>
            </footer>
        </div>
    );
};
