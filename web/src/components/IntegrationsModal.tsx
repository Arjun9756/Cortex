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

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getIntegrationsStatus();
      setIntegrations(res.integrations);
    } catch (err: any) {
      console.error('Failed to load integrations status', err);
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
    github: <GitCommit className="h-5 w-5 text-emerald-400" />,
    slack: <MessageSquare className="h-5 w-5 text-purple-400" />,
    jira: <AlertCircle className="h-5 w-5 text-sky-400" />,
  };

  const providerTheme = {
    github: {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      activeTab: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      accent: 'emerald',
    },
    slack: {
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      activeTab: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
      accent: 'purple',
    },
    jira: {
      badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      activeTab: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
      accent: 'sky',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Integrate Webhooks & Secret Keys</h3>
              <p className="text-xs text-slate-400">Connect live event webhooks for real-time engineering risk analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6 pt-3 space-x-2">
          {(['github', 'slack', 'jira'] as const).map(provider => {
            const item = integrations?.[provider];
            const isActive = activeTab === provider;
            const theme = providerTheme[provider];

            return (
              <button
                key={provider}
                onClick={() => setActiveTab(provider)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold border-t border-x transition-all ${
                  isActive
                    ? `${theme.activeTab} border-b-transparent font-bold`
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {providerIcons[provider]}
                <span className="capitalize">{provider}</span>
                {item?.isConfigured ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loading || !currentIntegration ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading integration status...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Integration Status Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {providerIcons[activeTab]}
                  <div>
                    <h4 className="text-sm font-semibold text-white capitalize">{currentIntegration.name} Integration</h4>
                    <p className="text-xs text-slate-400">
                      Signature Security: <code className="text-indigo-300">{currentIntegration.signatureHeader}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Events Ingested</span>
                    <span className="text-xs font-bold text-indigo-300">{currentIntegration.eventCount} total</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
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
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Webhook Listener URL</span>
                  <span className="text-[11px] text-slate-400">Provide this URL to {currentIntegration.name} Webhook Settings</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 truncate">
                    {window.location.origin}{currentIntegration.webhookUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(currentIntegration.webhookUrl, `url-${activeTab}`)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all flex items-center space-x-1.5"
                  >
                    {copiedField === `url-${activeTab}` ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secret Key Input & Save */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    Secret Key / Signing Token
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
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
                      className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret({ ...showSecret, [activeTab]: !showSecret[activeTab] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showSecret[activeTab] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleSaveSecret(activeTab)}
                    disabled={savingProvider === activeTab || !secretsInput[activeTab]}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5"
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
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                  How to setup in {currentIntegration.name}:
                </h5>

                {activeTab === 'github' && (
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 leading-relaxed">
                    <li>Open your GitHub repository → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add Webhook</strong>.</li>
                    <li>Paste the <strong>Webhook Listener URL</strong> in the <em>Payload URL</em> field.</li>
                    <li>Set Content type to <code>application/json</code>.</li>
                    <li>Paste the <strong>Secret Key</strong> specified above into the <em>Secret</em> field.</li>
                    <li>Select <strong>Send me everything</strong> or Push / Pull Request / Issues events, then click <strong>Add Webhook</strong>.</li>
                  </ol>
                )}

                {activeTab === 'slack' && (
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 leading-relaxed">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Slack API Apps</a> → Create or select your App.</li>
                    <li>Under <strong>Event Subscriptions</strong>, toggle On and paste the <strong>Webhook Listener URL</strong>.</li>
                    <li>Copy your App’s <strong>Signing Secret</strong> from Basic Information.</li>
                    <li>Paste that Signing Secret into the Secret Key input above and click <strong>Save Secret</strong>.</li>
                  </ol>
                )}

                {activeTab === 'jira' && (
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1 leading-relaxed">
                    <li>Go to Jira System Administration → <strong>System</strong> → <strong>Webhooks</strong>.</li>
                    <li>Click <strong>Create a Webhook</strong> and paste the <strong>Webhook Listener URL</strong> (including secret query param).</li>
                    <li>Under Events, check Issue Created, Issue Updated, and Comment Created.</li>
                    <li>Click <strong>Save</strong> to start streaming Jira issues into Cortex.</li>
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
