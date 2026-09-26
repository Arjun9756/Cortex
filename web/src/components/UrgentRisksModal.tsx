import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  FolderGit2,
  Users,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import type { RiskAlertItem } from '../lib/api';

interface UrgentRisksModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: RiskAlertItem[];
  onNavigate?: (tab: 'bus-factor' | 'people' | 'technologies' | 'pull-requests') => void;
}

export const UrgentRisksModal: React.FC<UrgentRisksModalProps> = ({
  isOpen,
  onClose,
  alerts = [],
  onNavigate
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'Bus Factor' | 'Knowledge Risk' | 'Skill Dependency'>('all');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const spofCount = alerts.filter(a => a.category === 'Bus Factor' || a.entityType === 'repo').length;
  const peopleRiskCount = alerts.filter(a => a.category === 'Knowledge Risk' || a.entityType === 'person').length;
  const techRiskCount = alerts.filter(a => a.category === 'Skill Dependency' || a.entityType === 'tech').length;

  const filteredAlerts = alerts.filter(alert => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'Bus Factor') return alert.category === 'Bus Factor' || alert.entityType === 'repo';
    if (activeCategory === 'Knowledge Risk') return alert.category === 'Knowledge Risk' || alert.entityType === 'person';
    if (activeCategory === 'Skill Dependency') return alert.category === 'Skill Dependency' || alert.entityType === 'tech';
    return true;
  });

  const getRemediationAdvice = (alert: RiskAlertItem): string => {
    if (alert.category === 'Bus Factor' || alert.entityType === 'repo') {
      return `Assign a co-maintainer or cross-train a secondary engineer to review PRs and eliminate single point of failure (target Bus Factor ≥ 2.0).`;
    }
    if (alert.category === 'Knowledge Risk' || alert.entityType === 'person') {
      return `Schedule architectural walkthroughs and pair-programming sessions with backup engineers to distribute ownership.`;
    }
    if (alert.category === 'Skill Dependency' || alert.entityType === 'tech') {
      return `Document deployment runbooks and train at least 1 secondary contributor on this technology stack.`;
    }
    return `Review repository activity and establish distributed code review coverage.`;
  };

  const handleInspectEntity = (alert: RiskAlertItem) => {
    onClose();
    if (!onNavigate) return;
    if (alert.entityType === 'repo' || alert.category === 'Bus Factor') {
      onNavigate('bus-factor');
    } else if (alert.entityType === 'person' || alert.category === 'Knowledge Risk') {
      onNavigate('people');
    } else if (alert.entityType === 'tech' || alert.category === 'Skill Dependency') {
      onNavigate('technologies');
    } else {
      onNavigate('bus-factor');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[88vh] bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  Active Urgent Risk Alerts ({alerts.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                    {criticalCount} Critical
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    {warningCount} Warning
                  </span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                Real-time organizational vulnerabilities detected across repository ownership, individual departure risk, and single-expert technologies.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 pt-3 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-t border-b-2 font-medium transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'border-indigo-500 text-[var(--text-primary)] bg-[var(--bg-subtle)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All Active Risks ({alerts.length})
          </button>
          <button
            onClick={() => setActiveCategory('Bus Factor')}
            className={`px-3 py-1.5 rounded-t border-b-2 font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeCategory === 'Bus Factor'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-[var(--text-muted)] hover:text-rose-300'
            }`}
          >
            <FolderGit2 className="h-3.5 w-3.5" />
            <span>SPOF Repositories ({spofCount})</span>
          </button>
          <button
            onClick={() => setActiveCategory('Knowledge Risk')}
            className={`px-3 py-1.5 rounded-t border-b-2 font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeCategory === 'Knowledge Risk'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-[var(--text-muted)] hover:text-amber-300'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Knowledge Risk ({peopleRiskCount})</span>
          </button>
          <button
            onClick={() => setActiveCategory('Skill Dependency')}
            className={`px-3 py-1.5 rounded-t border-b-2 font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeCategory === 'Skill Dependency'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-[var(--text-muted)] hover:text-purple-300'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Single-Expert Stack ({techRiskCount})</span>
          </button>
        </div>

        {/* Modal Body - List of Risks */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)] space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Active Risks in this Category</h4>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                All tracked assets in this category meet healthy enterprise operational standards.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isCritical = alert.severity === 'critical';
              const isRepo = alert.entityType === 'repo' || alert.category === 'Bus Factor';
              const isPerson = alert.entityType === 'person' || alert.category === 'Knowledge Risk';
              const isTech = alert.entityType === 'tech' || alert.category === 'Skill Dependency';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCritical
                      ? 'border-l-4 border-l-rose-500 border-[var(--border-subtle)]'
                      : 'border-l-4 border-l-amber-500 border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {alert.severity}
                      </span>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center space-x-1">
                        {isRepo && <FolderGit2 className="h-3 w-3 text-cyan-400" />}
                        {isPerson && <Users className="h-3 w-3 text-indigo-400" />}
                        {isTech && <Cpu className="h-3 w-3 text-purple-400" />}
                        <span>{alert.category}</span>
                      </span>

                      <h4 className="text-sm font-bold text-[var(--text-primary)]">
                        {alert.entityName}
                      </h4>

                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        Risk Score: {alert.riskScore}%
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                      {alert.whyItMatters}
                    </p>

                    <div className="p-2.5 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-start space-x-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-[var(--text-muted)]">
                        <strong className="text-[var(--text-secondary)] font-medium">Recommended Action:</strong>{' '}
                        {getRemediationAdvice(alert)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleInspectEntity(alert)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--accent-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-indigo-300 transition-colors flex items-center space-x-1.5 shrink-0 self-start md:self-center cursor-pointer group"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono shrink-0">
          <span>Enterprise Risk Management • Cortex Engineering Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
