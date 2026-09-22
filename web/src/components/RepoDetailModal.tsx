import React from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  GitCommit,
  Cpu,
  Award,
  AlertTriangle,
  FolderGit2,
  UserCheck
} from 'lucide-react';
import type { RepositoryDetails } from '../lib/api';
import { SuccessorCandidateCard } from './SuccessorCandidateCard';

interface RepoDetailModalProps {
  details: RepositoryDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onNavigatePerson?: (personName: string) => void;
}

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({
  details,
  loading,
  error,
  onClose,
}) => {
  if (!details && !loading && !error) return null;

  const isSPOF = (details?.busFactor ?? 1) <= 1;
  const isHighRisk = (details?.riskScore ?? 0) >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-md bg-[var(--accent-muted)] border border-[var(--accent-border)] text-indigo-400">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                  {details?.repoName || 'Repository Details'}
                </h3>
                {details && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      isSPOF
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    Bus Factor {details.busFactor} {isSPOF ? '• Single Point of Failure' : '• Healthy'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Deep architectural risk analysis, ownership concentration & backup owner recommendations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="p-12 text-center space-y-2">
              <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">Traversing knowledge graph & calculating risk metrics...</p>
              <p className="text-[11px] text-[var(--text-muted)]">Querying contributors, multi-hop technologies & candidate backups.</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-md flex items-center justify-between text-rose-300">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-xs text-[var(--text-primary)]">Failed to load repository details</h4>
                  <p className="text-xs text-rose-300/80">{error}</p>
                </div>
              </div>
            </div>
          ) : details ? (
            <>
              {/* Top Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Bus Factor Rating
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${isSPOF ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {details.busFactor}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {isSPOF ? '(Critical SPOF)' : '(Acceptable)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Min contributors covering ≥50% commits
                  </p>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Total Risk Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${isHighRisk ? 'text-rose-400' : 'text-amber-400'}`}>
                      {details.riskScore}%
                    </span>
                    <span className="text-xs text-[var(--text-muted)] uppercase font-mono">
                      {details.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Fragility index based on co-authorship
                  </p>
                </div>

                <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Active Contributors
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-cyan-400">
                      {details.contributorCount}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Indexed engineer{details.contributorCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Primary: {details.primaryOwner?.name || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* ─── SECTION 1: PRIMARY MAINTAINER & OWNERSHIP ──────────────────── */}
              <div className="p-4 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Primary Contributor & Ownership Concentration</span>
                </h4>

                {details.primaryOwner ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-indigo-300 font-bold text-xs">
                        {details.primaryOwner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] text-xs">
                            {details.primaryOwner.name}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent-muted)] text-indigo-300 border border-[var(--accent-border)]">
                            Primary Owner
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {details.primaryOwner.role || 'Software Engineer'} • {details.primaryOwner.email || 'Author'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-2 sm:pt-0 sm:pl-4 text-xs font-mono">
                      <div>
                        <span className="text-[var(--text-muted)] block text-[10px] uppercase">Commits</span>
                        <span className="font-bold text-[var(--text-primary)]">{details.primaryOwner.commitCount}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[10px] uppercase">Ownership</span>
                        <span className={`font-bold ${details.primaryOwner.ownershipPercentage >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {details.primaryOwner.ownershipPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">No primary contributor identified in git records.</p>
                )}

                {/* Additional Contributors if any */}
                {details.contributors.length > 1 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] block mb-1.5 uppercase">
                      Other Contributors ({details.contributors.length - 1}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {details.contributors.slice(1).map((c, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center gap-1.5"
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">({c.commitCount} commits)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── SECTION 2: WHY THIS IS RISKY (EVIDENCE-BASED) ──────────────── */}
              <div className={`p-4 rounded-md border space-y-2.5 ${
                isSPOF ? 'bg-rose-500/5 border-rose-500/20' : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
              }`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isSPOF ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {isSPOF ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>Why This Is Risky (Evidence Analysis)</span>
                </h4>

                <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                  {details.riskExplanation.summary}
                </p>

                <div className="space-y-1.5 pt-0.5">
                  {details.riskExplanation.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-[var(--text-secondary)]">
                      <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── SECTION 3: TECHNOLOGIES USED IN THIS REPO ─────────────────── */}
              <div className="p-4 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Technologies & Stack in this Repository ({details.technologies.length})</span>
                </h4>

                {details.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {details.technologies.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-300 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        <span>{tech}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific technology relationships indexed for this repository.</p>
                )}
              </div>

              {/* ─── SECTION 4: RECENT ACTIVITY (LAST 30 DAYS COMMITS/PRS) ───────── */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  <span>Recent Activity & Commits ({details.recentActivity.length})</span>
                </h4>

                {details.recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {details.recentActivity.map((act, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#090d18] border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                            act.type === 'PULL_REQUEST'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {act.type}
                          </span>
                          <span className="font-mono text-slate-200 truncate">
                            {act.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0 text-slate-400 text-[11px] font-mono">
                          <span>{act.author}</span>
                          <span className="text-slate-600">•</span>
                          <span>{act.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No recent commit or pull request events recorded in the last 30 days.</p>
                )}
              </div>

              {/* ─── SECTION 5: SUGGESTED BACKUP OWNERS (SUCCESSOR LOGIC) ───────── */}
              <div className="p-5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>Suggested Backup Owners (Successor Recommendation Engine)</span>
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Based on 4-factor tech overlap & capacity formula
                  </span>
                </div>

                {details.suggestedBackups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {details.suggestedBackups.map((candidate, idx) => (
                      <SuccessorCandidateCard key={idx} candidate={candidate} />
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                    <p>No qualified candidate with shared technology overlap was identified in the graph.</p>
                    <p className="text-[10px] text-slate-500 mt-1">Cross-skilling recommended to eliminate single-contributor risk.</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#070a12] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Repository Knowledge Risk Audit • Cortex Live Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
