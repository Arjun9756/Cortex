import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ShieldCheck, Key, RefreshCw, Eye, EyeOff, GitCommit, MessageSquare, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { getIntegrationsStatus, updateIntegrationSecrets, type IntegrationItem } from '../lib/api.js';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [integrations, setIntegrations] = useState<Record<string, IntegrationItem> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'github' | 'slack' | 'jira'>('github');
  const [secretsInput, setSecretsInput] = useState<Record<string, string>>({
    github: '',
    slack: '',
    jira: '',
  });
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({
    github: false,
    slack: false,
    jira: false,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getIntegrationsStatus();
      setIntegrations(res.integrations);
    } catch (err: any) {
      console.error('Failed to load integrations status', err);
      setIntegrations(null);
      setLoadError(err.message || 'Unable to load integration status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldId: string) => {
    const fullUrl = text.startsWith('http') ? text : `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveSecret = async (provider: 'github' | 'slack' | 'jira') => {
    const secretValue = secretsInput[provider];
    if (!secretValue) {
      setStatusMessage({ type: 'error', text: `Please enter a valid secret key for ${provider.toUpperCase()}` });
      return;
    }

    setSavingProvider(provider);
    setStatusMessage(null);

    try {
      const res = await updateIntegrationSecrets(provider, secretValue);
      if (res.status) {
        setStatusMessage({ type: 'success', text: `Updated ${provider.toUpperCase()} webhook secret successfully!` });
        setSecretsInput(prev => ({ ...prev, [provider]: '' }));
        await fetchStatus();
        if (onUpdated) onUpdated();
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to update secret key' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update secret key' });
    } finally {
      setSavingProvider(null);
    }
  };

  const currentIntegration = integrations ? integrations[activeTab] : null;

  const providerIcons = {
    github: <GitCommit className="h-4 w-4 text-emerald-400" />,
    slack: <MessageSquare className="h-4 w-4 text-[var(--accent-default)]" />,
    jira: <AlertCircle className="h-4 w-4 text-sky-400" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <Sparkles className="h-4 w-4 text-[var(--accent-default)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Integrate Webhooks & Secret Keys</h3>
              <p className="text-xs text-[var(--text-secondary)]">Connect event webhooks for automated engineering risk analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-6 pt-2 space-x-1">
          {(['github', 'slack', 'jira'] as const).map(provider => {
            const item = integrations?.[provider];
            const isActive = activeTab === provider;

            return (
              <button
                key={provider}
                onClick={() => setActiveTab(provider)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[var(--accent-default)] text-[var(--text-primary)] bg-[var(--bg-elevated)] rounded-t'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)] rounded-t'
                }`}
              >
                {providerIcons[provider]}
                <span className="capitalize">{provider}</span>
                {item?.isConfigured ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusMessage && (
            <div
              className={`p-3 rounded-md text-xs font-medium border flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loadError ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <AlertCircle className="h-6 w-6 text-rose-400" />
              <p className="text-xs text-rose-300">{loadError}</p>
              <button onClick={fetchStatus} className="cortex-btn-secondary px-3 py-1.5 text-xs rounded-md">Retry</button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="h-5 w-5 text-[var(--accent-default)] animate-spin" />
              <p className="text-xs text-[var(--text-secondary)]">Loading integration status...</p>
            </div>
          ) : !currentIntegration ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <AlertCircle className="h-6 w-6 text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-secondary)]">No integration status available for {activeTab}.</p>
              <button onClick={fetchStatus} className="cortex-btn-secondary px-3 py-1.5 text-xs rounded-md">Retry</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Integration Status Card */}
              <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {providerIcons[activeTab]}
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] capitalize">{currentIntegration.name} Integration</h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Signature Security: <code className="text-[var(--accent-default)] font-mono">{currentIntegration.signatureHeader}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--text-muted)] block">Events Ingested</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">
                      {currentIntegration.eventCount > 0 ? `${currentIntegration.eventCount} total` : '0 (Waiting)'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 ${
                      currentIntegration.isConfigured
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {currentIntegration.isConfigured ? 'Secret Configured' : 'Missing Secret'}
                  </span>
                </div>
              </div>

              {/* Webhook Endpoint Copy Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Webhook Listener URL</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Provide this URL to {currentIntegration.name} Webhook Settings</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 rounded-md bg-[var(--bg-app)] border border-[var(--border-strong)] font-mono text-xs text-[var(--accent-default)] truncate">
                    {window.location.origin}{currentIntegration.webhookUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(currentIntegration.webhookUrl, `url-${activeTab}`)}
                    className="cortex-btn-secondary px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    {copiedField === `url-${activeTab}` ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secret Key Input & Save */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    Secret Key / Signing Token
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    Current: {currentIntegration.secretMasked || 'None'}
                  </span>
                </label>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showSecret[activeTab] ? 'text' : 'password'}
                      value={secretsInput[activeTab]}
                      onChange={e => setSecretsInput({ ...secretsInput, [activeTab]: e.target.value })}
                      placeholder={`Enter new ${currentIntegration.name} Secret Key...`}
                      className="w-full px-3 py-2 pr-9 rounded-md bg-[var(--bg-app)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret({ ...showSecret, [activeTab]: !showSecret[activeTab] })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      {showSecret[activeTab] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleSaveSecret(activeTab)}
                    disabled={savingProvider === activeTab || !secretsInput[activeTab]}
                    className="cortex-btn-primary px-3.5 py-2 rounded-md text-xs font-medium disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer"
                  >
                    {savingProvider === activeTab ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Save Secret</span>
                  </button>
                </div>
              </div>

              {/* Instructions Box */}
              <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                <h5 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--accent-default)]" />
                  How to setup in {currentIntegration.name}:
                </h5>

                {activeTab === 'github' && (
                  <ol className="list-decimal list-inside text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
                    <li>Open your GitHub repository → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add Webhook</strong>.</li>
                    <li>Paste the <strong>Webhook Listener URL</strong> in the <em>Payload URL</em> field.</li>
                    <li>Set Content type to <code>application/json</code>.</li>
                    <li>Paste the <strong>Secret Key</strong> specified above into the <em>Secret</em> field.</li>
                    <li>Select <strong>Send me everything</strong> or Push / Pull Request / Issues events, then click <strong>Add Webhook</strong>.</li>
                  </ol>
                )}

                {activeTab === 'slack' && (
                  <ol className="list-decimal list-inside text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-[var(--accent-default)] underline">Slack API Apps</a> → Create or select your App.</li>
                    <li>Under <strong>Event Subscriptions</strong>, toggle On and paste the <strong>Webhook Listener URL</strong>.</li>
                    <li>Copy your App’s <strong>Signing Secret</strong> from Basic Information.</li>
                    <li>Paste that Signing Secret into the Secret Key input above and click <strong>Save Secret</strong>.</li>
                  </ol>
                )}

                {activeTab === 'jira' && (
                  <ol className="list-decimal list-inside text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
                    <li>Go to Jira System Administration → <strong>System</strong> → <strong>Webhooks</strong>.</li>
                    <li>Click <strong>Create a Webhook</strong> and paste the <strong>Webhook Listener URL</strong>.</li>
                    <li>Configure the shared secret in the <code>X-Jira-Webhook-Secret</code> request header; never place it in the URL.</li>
                    <li>Under Events, check Issue Created, Issue Updated, and Comment Created.</li>
                    <li>Click <strong>Save</strong> to start streaming Jira issues into Cortex.</li>
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="cortex-btn-secondary px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
