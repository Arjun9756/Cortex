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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c1222] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  {details?.repoName || 'Repository Details'}
                </h3>
                {details && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isSPOF
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    Bus Factor {details.busFactor} {isSPOF ? '• Single Point of Failure' : '• Healthy'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deep architectural risk analysis, ownership concentration & backup owner recommendations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Traversing knowledge graph & calculating risk metrics...</p>
              <p className="text-xs text-slate-500">Querying contributors, multi-hop technologies & candidate backups.</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-300">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-white">Failed to load repository details</h4>
                  <p className="text-xs text-rose-300/80">{error}</p>
                </div>
              </div>
            </div>
          ) : details ? (
            <>
              {/* Top Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Bus Factor Rating
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-extrabold ${isSPOF ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {details.busFactor}
                    </span>
                    <span className="text-xs text-slate-400">
                      {isSPOF ? '(Critical SPOF)' : '(Acceptable)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Min contributors covering ≥50% commits
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Risk Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-extrabold ${isHighRisk ? 'text-rose-400' : 'text-amber-400'}`}>
                      {details.riskScore}%
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-mono">
                      {details.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fragility index based on co-authorship
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Active Contributors
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-cyan-400">
                      {details.contributorCount}
                    </span>
                    <span className="text-xs text-slate-400">
                      Indexed engineer{details.contributorCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Primary: {details.primaryOwner?.name || 'Unassigned'}
                  </p>
                </div>
              </div>

              {/* ─── SECTION 1: PRIMARY MAINTAINER & OWNERSHIP ──────────────────── */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span>Primary Contributor & Ownership Concentration</span>
                </h4>

                {details.primaryOwner ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#090d18] border border-slate-800">
                    <div className="flex items-center space-x-3.5">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {details.primaryOwner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {details.primaryOwner.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Primary Owner
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {details.primaryOwner.role || 'Software Engineer'} • {details.primaryOwner.email || 'Author'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Commits</span>
                        <span className="font-bold text-white">{details.primaryOwner.commitCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Ownership</span>
                        <span className={`font-bold ${details.primaryOwner.ownershipPercentage >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {details.primaryOwner.ownershipPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No primary contributor identified in git records.</p>
                )}

                {/* Additional Contributors if any */}
                {details.contributors.length > 1 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      Other Contributors ({details.contributors.length - 1}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {details.contributors.slice(1).map((c, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2"
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">({c.commitCount} commits)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ─── SECTION 2: WHY THIS IS RISKY (EVIDENCE-BASED) ──────────────── */}
              <div className={`p-5 rounded-2xl border space-y-3 ${
                isSPOF ? 'bg-rose-500/5 border-rose-500/20' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isSPOF ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {isSPOF ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>Why This Is Risky (Evidence Analysis)</span>
                </h4>

                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {details.riskExplanation.summary}
                </p>

                <div className="space-y-2 pt-1">
                  {details.riskExplanation.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                      <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── SECTION 3: TECHNOLOGIES USED IN THIS REPO ─────────────────── */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>Technologies & Stack in this Repository ({details.technologies.length})</span>
                </h4>

                {details.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
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
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/30 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>Suggested Backup Owners (Successor Recommendation Engine)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
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
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
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
