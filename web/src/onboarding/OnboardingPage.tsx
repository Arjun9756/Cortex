import React, { useState, useEffect } from 'react';
import {
    fetchIntegrationsStatus,
    getOAuthAuthorizeUrl,
    fetchRealGitHubRepos,
    fetchRealSlackChannels,
    fetchRealJiraProjects,
    saveIntegrationScope,
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

interface OnboardingPageProps {
    onComplete?: () => void;
    onBackToLanding?: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
    onComplete,
    onBackToLanding,
}) => {
    const [connectors, setConnectors] = useState<Record<SupportedProvider, ConnectorInfo> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [connectingProvider, setConnectingProvider] = useState<SupportedProvider | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Real Resource Lists (Fetched via provider APIs upon successful OAuth)
    const [githubRepos, setGithubRepos] = useState<RealGitHubRepo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
    const [slackChannels, setSlackChannels] = useState<RealSlackChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
    const [jiraProjects, setJiraProjects] = useState<RealJiraProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

    // Scoping state
    const [githubScopeAll, setGithubScopeAll] = useState<boolean>(true);
    const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
    const [slackScopeAll, setSlackScopeAll] = useState<boolean>(true);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [jiraScopeAll, setJiraScopeAll] = useState<boolean>(true);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    // OAuth App Setup Modal (when Client ID is missing in .env)
    const [setupModalProvider, setSetupModalProvider] = useState<SupportedProvider | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const loadStatus = async () => {
        try {
            setLoading(true);
            const statuses = await fetchIntegrationsStatus();
            setConnectors(statuses);

            // If GitHub is connected, fetch its real repos
            if (statuses.github.status === 'connected') {
                loadRealRepos();
                setGithubScopeAll(statuses.github.scopeRules?.allMonitored ?? true);
                setSelectedRepos(statuses.github.scopeRules?.monitoredItems?.filter(i => i !== '*') ?? []);
            }
            // If Slack is connected, fetch its real channels
            if (statuses.slack.status === 'connected') {
                loadRealChannels();
                setSlackScopeAll(statuses.slack.scopeRules?.allMonitored ?? true);
                setSelectedChannels(statuses.slack.scopeRules?.monitoredItems?.filter(i => i !== '*') ?? []);
            }
            // If Jira is connected, fetch its real projects
            if (statuses.jira.status === 'connected') {
                loadRealProjects();
                setJiraScopeAll(statuses.jira.scopeRules?.allMonitored ?? true);
                setSelectedProjects(statuses.jira.scopeRules?.monitoredItems?.filter(i => i !== '*') ?? []);
            }
        } catch (err: any) {
            console.error('Failed to load connector status:', err);
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
            console.warn('Could not fetch real GitHub repos:', err?.message);
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
            console.warn('Could not fetch real Slack channels:', err?.message);
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
            console.warn('Could not fetch real Jira projects:', err?.message);
        } finally {
            setLoadingProjects(false);
        }
    };

    useEffect(() => {
        loadStatus();

        // Check if redirected directly with claim_ticket URL param (fallback when popup was blocked)
        const urlParams = new URLSearchParams(window.location.search);
        const claimTicket = urlParams.get('claim_ticket');
        const claimProvider = urlParams.get('provider') as SupportedProvider | null;
        if (claimTicket && claimProvider) {
            claimIntegrationTicket(claimProvider, claimTicket)
                .then(() => {
                    showToast(`✓ ${claimProvider.toUpperCase()} connected successfully!`, 'success');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    loadStatus();
                })
                .catch((e: any) => showToast(e?.message || 'Failed to claim token', 'error'));
        }

        // Listen for OAuth completion message from popup window (standard Vercel/Linear pattern)
        const handleMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'CORTEX_OAUTH_TICKET') {
                const provider = event.data?.provider as SupportedProvider;
                const ticket = event.data?.ticket as string;
                try {
                    showToast(`Finalizing ${provider.toUpperCase()} connection...`, 'info');
                    await claimIntegrationTicket(provider, ticket);
                    showToast(`✓ ${provider.toUpperCase()} connected successfully!`, 'success');
                    setConnectingProvider(null);
                    await loadStatus();
                } catch (cErr: any) {
                    showToast(cErr?.message || 'Failed to complete authorization ticket exchange', 'error');
                    setConnectingProvider(null);
                }
            } else if (event.data?.type === 'CORTEX_OAUTH_SUCCESS') {
                const provider = event.data?.provider as SupportedProvider;
                showToast(`✓ ${provider.toUpperCase()} connected successfully!`, 'success');
                setConnectingProvider(null);
                loadStatus();
            } else if (event.data?.type === 'CORTEX_OAUTH_ERROR') {
                const err = event.data?.error || 'OAuth authorization cancelled or failed';
                showToast(err, 'error');
                setConnectingProvider(null);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Real OAuth Connect flow (like Vercel)
    const handleConnect = async (provider: SupportedProvider) => {
        setConnectingProvider(provider);
        try {
            const { url } = await getOAuthAuthorizeUrl(provider);

            // Open OAuth consent page in a focused popup window
            const width = 640;
            const height = 750;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                url,
                `cortex-oauth-${provider}`,
                `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
            );

            if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                // Popup blocked, fall back to full page redirect
                window.location.href = url;
            } else {
                popup.focus();
            }
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
        if (!confirm(`Are you sure you want to disconnect ${provider.toUpperCase()}? This will remove its stored credentials.`)) {
            return;
        }
        try {
            await disconnectIntegration(provider);
            showToast(`${provider.toUpperCase()} disconnected.`, 'info');
            loadStatus();
        } catch (err: any) {
            showToast(err.message || 'Failed to disconnect', 'error');
        }
    };

    const handleSaveGithubScope = async () => {
        try {
            await saveIntegrationScope('github', {
                allMonitored: githubScopeAll,
                monitoredItems: githubScopeAll ? ['*'] : selectedRepos,
            });
            showToast('GitHub scope saved successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const handleSaveSlackScope = async () => {
        try {
            await saveIntegrationScope('slack', {
                allMonitored: slackScopeAll,
                monitoredItems: slackScopeAll ? ['*'] : selectedChannels,
            });
            showToast('Slack scope saved successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const handleSaveJiraScope = async () => {
        try {
            await saveIntegrationScope('jira', {
                allMonitored: jiraScopeAll,
                monitoredItems: jiraScopeAll ? ['*'] : selectedProjects,
            });
            showToast('Jira scope saved successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to save scope', 'error');
        }
    };

    const hasAnyConnected = connectors && Object.values(connectors).some(c => c.status === 'connected');

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center p-6 text-slate-300">
                <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium tracking-wide text-slate-400">Loading Cortex Onboarding…</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Top Navigation */}
            <header className="border-b border-slate-800/80 px-8 py-5 flex items-center justify-between backdrop-blur-md bg-[#070b14]/80 sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                        C
                    </div>
                    <span className="font-bold tracking-tight text-white text-lg">Cortex</span>
                    <span className="text-xs font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full ml-1">
                        BYOC Onboarding
                    </span>
                </div>
                {onBackToLanding && (
                    <button
                        onClick={onBackToLanding}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        ← Back to Marketing Site
                    </button>
                )}
            </header>

            {/* Main Content Area */}
            <main className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full">
                {/* Header Title */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        Connect your engineering tools
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Authorize Cortex via official OAuth to ingest commit activity, PR lifecycles, and team discussions into your live Knowledge Graph.
                    </p>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div className={`mb-8 p-4 rounded-xl border text-sm flex items-center justify-between animate-fade-in ${
                        toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                        toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
                        'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    }`}>
                        <span>{toast.message}</span>
                        <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-4">✕</button>
                    </div>
                )}

                {/* 3 Provider Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* ──── GITHUB CARD ──── */}
                    <div className={`bg-[#0c1222] border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                        connectors?.github?.status === 'connected' ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                    }`}>
                        {/* Status Badge */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-white">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                            </div>
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                connectors?.github?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                connectors?.github?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {connectors?.github?.status === 'connected' ? '✓ Connected' :
                                 connectors?.github?.status === 'needs_reauth' ? '⚠ Needs Re-auth' : 'Not Connected'}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">GitHub</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Ingest repositories, commit author attribution, branches, PR review cycles, and co-authors.
                            </p>

                            {/* Connected account summary */}
                            {connectors?.github?.status === 'connected' && (
                                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        {connectors.github.accountAvatar ? (
                                            <img src={connectors.github.accountAvatar} alt="avatar" className="w-6 h-6 rounded-full border border-slate-700" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">👤</div>
                                        )}
                                        <div className="truncate">
                                            <p className="text-xs font-semibold text-slate-200 truncate">{connectors.github.accountName || 'Authorized User'}</p>
                                            {connectors.github.accountEmail && <p className="text-[10px] text-slate-500 truncate">{connectors.github.accountEmail}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDisconnect('github')}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer px-2 py-1"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}

                            {/* Real Scope / Resource Selection (Shown ONLY AFTER connection!) */}
                            {connectors?.github?.status === 'connected' && (
                                <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-300">Monitor Repositories</label>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {loadingRepos ? 'Fetching repos…' : `${githubRepos.length} repos available`}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="gh-all"
                                            checked={githubScopeAll}
                                            onChange={(e) => setGithubScopeAll(e.target.checked)}
                                            className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                        />
                                        <label htmlFor="gh-all" className="text-xs text-slate-300 cursor-pointer">
                                            All repositories in account
                                        </label>
                                    </div>

                                    {!githubScopeAll && (
                                        <div className="space-y-2 mt-2">
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                                                {loadingRepos ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">Loading your GitHub repos…</p>
                                                ) : githubRepos.length === 0 ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">No repositories found in account.</p>
                                                ) : (
                                                    githubRepos.map(repo => (
                                                        <label key={repo.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900/80 p-1 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedRepos.includes(repo.name) || selectedRepos.includes(repo.fullName)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedRepos([...selectedRepos, repo.name]);
                                                                    } else {
                                                                        setSelectedRepos(selectedRepos.filter(r => r !== repo.name && r !== repo.fullName));
                                                                    }
                                                                }}
                                                                className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                                            />
                                                            <span className="truncate flex-1">{repo.fullName}</span>
                                                            {repo.isPrivate && (
                                                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">Private</span>
                                                            )}
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <button
                                                onClick={handleSaveGithubScope}
                                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                                            >
                                                Save Scoping
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <div className="mt-6 pt-4 border-t border-slate-800/80">
                            {connectors?.github?.status !== 'connected' ? (
                                <button
                                    onClick={() => handleConnect('github')}
                                    disabled={connectingProvider === 'github'}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {connectingProvider === 'github' ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Redirecting to GitHub…
                                        </>
                                    ) : (
                                        <>
                                            <span>⚡</span> Connect GitHub (Real OAuth)
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="text-center text-xs text-emerald-400 font-medium py-1">
                                    ✓ Authenticated with GitHub OAuth
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ──── SLACK CARD ──── */}
                    <div className={`bg-[#0c1222] border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                        connectors?.slack?.status === 'connected' ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[#e01e5a]">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.528 2.528 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z"/>
                                </svg>
                            </div>
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                connectors?.slack?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                connectors?.slack?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {connectors?.slack?.status === 'connected' ? '✓ Connected' :
                                 connectors?.slack?.status === 'needs_reauth' ? '⚠ Needs Re-auth' : 'Not Connected'}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Slack</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Correlate engineer identities, map architecture discussions, decisions, and knowledge sharing.
                            </p>

                            {connectors?.slack?.status === 'connected' && (
                                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 mb-4 flex items-center justify-between">
                                    <div className="truncate">
                                        <p className="text-xs font-semibold text-slate-200 truncate">{connectors.slack.accountName || 'Slack Workspace'}</p>
                                        <p className="text-[10px] text-slate-500">Workspace connected</p>
                                    </div>
                                    <button
                                        onClick={() => handleDisconnect('slack')}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer px-2 py-1"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}

                            {/* Scoping Section (Shown ONLY AFTER connection!) */}
                            {connectors?.slack?.status === 'connected' && (
                                <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-300">Monitor Channels</label>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {loadingChannels ? 'Fetching channels…' : `${slackChannels.length} channels`}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="slack-all"
                                            checked={slackScopeAll}
                                            onChange={(e) => setSlackScopeAll(e.target.checked)}
                                            className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                        />
                                        <label htmlFor="slack-all" className="text-xs text-slate-300 cursor-pointer">
                                            All channels bot is invited to
                                        </label>
                                    </div>

                                    {!slackScopeAll && (
                                        <div className="space-y-2 mt-2">
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                                                {loadingChannels ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">Loading Slack channels…</p>
                                                ) : slackChannels.length === 0 ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">No public channels accessible.</p>
                                                ) : (
                                                    slackChannels.map(ch => (
                                                        <label key={ch.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900/80 p-1 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedChannels.includes(ch.name) || selectedChannels.includes(ch.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedChannels([...selectedChannels, ch.name]);
                                                                    } else {
                                                                        setSelectedChannels(selectedChannels.filter(c => c !== ch.name && c !== ch.id));
                                                                    }
                                                                }}
                                                                className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                                            />
                                                            <span className="truncate flex-1">#{ch.name}</span>
                                                            <span className="text-[10px] text-slate-500">{ch.memberCount} members</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <button
                                                onClick={handleSaveSlackScope}
                                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                                            >
                                                Save Scoping
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80">
                            {connectors?.slack?.status !== 'connected' ? (
                                <button
                                    onClick={() => handleConnect('slack')}
                                    disabled={connectingProvider === 'slack'}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {connectingProvider === 'slack' ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Redirecting to Slack…
                                        </>
                                    ) : (
                                        <>
                                            <span>⚡</span> Connect Slack (Real OAuth)
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="text-center text-xs text-emerald-400 font-medium py-1">
                                    ✓ Authenticated with Slack OAuth
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ──── JIRA CARD ──── */}
                    <div className={`bg-[#0c1222] border rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                        connectors?.jira?.status === 'connected' ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-slate-800 hover:border-slate-700'
                    }`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[#0052cc]">
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23 .248H11.443a5.218 5.218 0 0 0 5.214 5.217h2.129v2.054A5.22 5.22 0 0 0 24 12.735V1.249A1.001 1.001 0 0 0 23 .248z"/>
                                </svg>
                            </div>
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                connectors?.jira?.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                connectors?.jira?.status === 'needs_reauth' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                                {connectors?.jira?.status === 'connected' ? '✓ Connected' :
                                 connectors?.jira?.status === 'needs_reauth' ? '⚠ Needs Re-auth' : 'Not Connected'}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Jira</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                Ingest sprint velocity, ticket reassignments, pending issue workloads, and resolution lead times.
                            </p>

                            {connectors?.jira?.status === 'connected' && (
                                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 mb-4 flex items-center justify-between">
                                    <div className="truncate">
                                        <p className="text-xs font-semibold text-slate-200 truncate">{connectors.jira.accountName || 'Jira Cloud Site'}</p>
                                        <p className="text-[10px] text-slate-500">Atlassian Cloud connected</p>
                                    </div>
                                    <button
                                        onClick={() => handleDisconnect('jira')}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer px-2 py-1"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}

                            {/* Scoping Section (Shown ONLY AFTER connection!) */}
                            {connectors?.jira?.status === 'connected' && (
                                <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-300">Monitor Projects</label>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {loadingProjects ? 'Fetching projects…' : `${jiraProjects.length} projects`}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="jira-all"
                                            checked={jiraScopeAll}
                                            onChange={(e) => setJiraScopeAll(e.target.checked)}
                                            className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                        />
                                        <label htmlFor="jira-all" className="text-xs text-slate-300 cursor-pointer">
                                            All Jira projects
                                        </label>
                                    </div>

                                    {!jiraScopeAll && (
                                        <div className="space-y-2 mt-2">
                                            <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                                                {loadingProjects ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">Loading Jira projects…</p>
                                                ) : jiraProjects.length === 0 ? (
                                                    <p className="text-xs text-slate-500 text-center py-2">No Jira projects found.</p>
                                                ) : (
                                                    jiraProjects.map(proj => (
                                                        <label key={proj.id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-900/80 p-1 rounded cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProjects.includes(proj.key) || selectedProjects.includes(proj.name)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedProjects([...selectedProjects, proj.key]);
                                                                    } else {
                                                                        setSelectedProjects(selectedProjects.filter(p => p !== proj.key && p !== proj.name));
                                                                    }
                                                                }}
                                                                className="rounded border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
                                                            />
                                                            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-indigo-300">{proj.key}</span>
                                                            <span className="truncate flex-1">{proj.name}</span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <button
                                                onClick={handleSaveJiraScope}
                                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                                            >
                                                Save Scoping
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80">
                            {connectors?.jira?.status !== 'connected' ? (
                                <button
                                    onClick={() => handleConnect('jira')}
                                    disabled={connectingProvider === 'jira'}
                                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {connectingProvider === 'jira' ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Redirecting to Atlassian…
                                        </>
                                    ) : (
                                        <>
                                            <span>⚡</span> Connect Jira (Real OAuth)
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="text-center text-xs text-emerald-400 font-medium py-1">
                                    ✓ Authenticated with Atlassian OAuth
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Continue to Dashboard CTA */}
                <div className="flex flex-col items-center justify-center gap-4 pt-4">
                    {hasAnyConnected ? (
                        <button
                            onClick={onComplete}
                            className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold text-sm rounded-xl shadow-xl shadow-indigo-500/25 transition-all duration-200 cursor-pointer flex items-center gap-2.5"
                        >
                            <span>Proceed to Executive Dashboard</span>
                            <span>→</span>
                        </button>
                    ) : (
                        <p className="text-xs text-slate-500">
                            Connect at least one tool above to proceed to the live Cortex dashboard.
                        </p>
                    )}
                </div>
            </main>

            {/* OAuth App Registration Modal (When credentials are missing in .env) */}
            {setupModalProvider && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>🛠</span>
                                <span>Register {setupModalProvider.toUpperCase()} OAuth App</span>
                            </h3>
                            <button
                                onClick={() => setSetupModalProvider(null)}
                                className="text-slate-400 hover:text-white cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                            To enable the real OAuth handshake, an OAuth App registration is required on the provider’s developer portal.
                        </p>

                        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                            <div>
                                <span className="text-slate-400 font-medium block mb-1">1. Developer Portal URL:</span>
                                {setupModalProvider === 'github' && (
                                    <a
                                        href="https://github.com/settings/applications/new"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-400 hover:underline font-mono"
                                    >
                                        https://github.com/settings/applications/new ↗
                                    </a>
                                )}
                                {setupModalProvider === 'slack' && (
                                    <a
                                        href="https://api.slack.com/apps?new_app=1"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:underline font-mono"
                                    >
                                        https://api.slack.com/apps?new_app=1 ↗
                                    </a>
                                )}
                                {setupModalProvider === 'jira' && (
                                    <a
                                        href="https://developer.atlassian.com/console/myapps/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:underline font-mono"
                                    >
                                        https://developer.atlassian.com/console/myapps/ ↗
                                    </a>
                                )}
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1">2. Authorization Callback URL:</span>
                                <code className="block bg-slate-900 p-2 rounded text-emerald-400 font-mono text-[11px] select-all border border-slate-800">
                                    http://localhost:3000/api/integrations/{setupModalProvider}/callback
                                </code>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1">3. Required Scopes:</span>
                                <code className="block bg-slate-900 p-2 rounded text-amber-300 font-mono text-[11px] border border-slate-800">
                                    {setupModalProvider === 'github' && 'repo, read:org, user:email, read:user'}
                                    {setupModalProvider === 'slack' && 'channels:read, groups:read, users:read, users:read.email, team:read'}
                                    {setupModalProvider === 'jira' && 'read:jira-work, read:jira-user, offline_access, read:me'}
                                </code>
                            </div>

                            <div>
                                <span className="text-slate-400 font-medium block mb-1">4. Add to .env:</span>
                                <pre className="bg-slate-900 p-2.5 rounded text-indigo-300 font-mono text-[11px] overflow-x-auto border border-slate-800">
{setupModalProvider === 'github' && `GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here`}
{setupModalProvider === 'slack' && `SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here`}
{setupModalProvider === 'jira' && `JIRA_CLIENT_ID=your_jira_client_id_here
JIRA_CLIENT_SECRET=your_jira_client_secret_here`}
                                </pre>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setSetupModalProvider(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-slate-800/80 px-8 py-5 text-center text-xs text-slate-500">
                Cortex Intelligence Platform • Zero-trust BYOC Architecture • All tokens stored encrypted in local PostgreSQL
            </footer>
        </div>
    );
};
