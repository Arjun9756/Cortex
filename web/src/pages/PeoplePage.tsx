import React, { useEffect, useState } from 'react';
import { getPeople, simulateDeparture as simulateDepartureApi, type PersonMetric, type DepartureSimulation } from '../lib/api';
import { Users, AlertTriangle, RefreshCw, GitCommit, FolderGit2, ShieldAlert, Award, UserMinus, X, Loader2, AlertCircle, Cpu } from 'lucide-react';
import { RISK_THRESHOLDS } from '../constants/riskThresholds';
import { SuccessorCandidateCard } from '../components/SuccessorCandidateCard';

interface PeoplePageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({ onSyncUpdated }) => {
  const [people, setPeople] = useState<PersonMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate Departure state
  const [simulation, setSimulation] = useState<DepartureSimulation | null>(null);
  const [simLoading, setSimLoading] = useState<string | null>(null); // externalId being simulated
  const [simError, setSimError] = useState<string | null>(null);

  const fetchPeople = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPeople();
      setPeople(data.people || []);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch people metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDeparture = async (person: PersonMetric) => {
    const extId = person.external_id || person.person_name;
    setSimLoading(extId);
    setSimError(null);
    setSimulation(null);
    try {
      const result = await simulateDepartureApi(extId);
      setSimulation(result);
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate departure');
    } finally {
      setSimLoading(null);
    }
  };

  const closeSimulation = () => {
    setSimulation(null);
    setSimError(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (simulation || simError)) {
        closeSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulation, simError]);

  useEffect(() => {
    fetchPeople();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--bg-elevated)] rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-sm">Failed to Load People Metrics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchPeople}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Breakdown bar component
  const BreakdownBar = ({ label, value, max = 10 }: { label: string; value: number; max?: number }) => {
    const pct = Math.min(100, Math.round((value / max) * 100));
    const isHigh = pct >= 70;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-secondary)] font-medium capitalize">{label}</span>
          <span className={`font-semibold font-mono ${isHigh ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>{value.toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-[var(--bg-app)] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isHigh ? 'bg-rose-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.max(4, pct)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 relative bg-[var(--bg-app)] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>People & Knowledge Loss Risk</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Engineers ranked by Knowledge Loss Risk score, top skills, and repository contributions.
          </p>
        </div>
        <button
          onClick={fetchPeople}
          className="px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs text-[var(--text-secondary)] hover:text-white rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {people.length === 0 ? (
        <div className="cortex-card p-12 text-center space-y-3">
          <Users className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Person Metrics Indexed Yet</h4>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Knowledge loss calculations run as part of the scheduled analytics job. Once team members have indexed graph data, profiles will populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {people.map(person => {
            const risk = person.risk_score ?? 0;
            const isCriticalRisk = risk >= RISK_THRESHOLDS.CRITICAL;
            const isHighRisk = risk >= RISK_THRESHOLDS.HIGH;
            const isModerateRisk = risk >= RISK_THRESHOLDS.MODERATE;

            const techList: Array<{ name: string; score: number }> = Array.isArray(person.top_technologies)
              ? person.top_technologies
              : typeof person.top_technologies === 'object' && person.top_technologies !== null
              ? Object.entries(person.top_technologies).map(([name, score]) => ({ name, score: Number(score) }))
              : [];

            const maxScore = Math.max(...techList.map(t => t.score || 1), 1);
            const reposList: string[] = Array.isArray(person.repos) ? person.repos : [];
            const isSimulating = simLoading === (person.external_id || person.person_name);

            return (
              <div
                key={person.external_id || person.person_name}
                className="cortex-card p-5 flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                        {(person?.person_name || person?.external_id || 'Person').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{person?.person_name || person?.external_id || 'Person'}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] font-mono">ID: {person?.external_id}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border flex items-center space-x-1 ${
                        isCriticalRisk
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : isHighRisk
                          ? 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                          : isModerateRisk
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      <span>{risk}% Risk</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3.5 p-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)] text-xs">
                    <div className="flex items-center space-x-2">
                      <GitCommit className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">Commits: <strong className="text-[var(--text-primary)]">{person.commit_count ?? 0}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FolderGit2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">Repos: <strong className="text-[var(--text-primary)]">{reposList.length}</strong></span>
                    </div>
                  </div>

                  {techList.length > 0 && (
                    <div className="mt-3.5 space-y-2">
                      <div className="flex items-center space-x-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        <Award className="h-3 w-3 text-indigo-400" />
                        <span>Top Skills & Usage</span>
                      </div>
                      <div className="space-y-1.5">
                        {techList.slice(0, 4).map((tech, idx) => {
                          const pct = Math.round((tech.score / maxScore) * 100);
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-[var(--text-secondary)] font-medium">{tech.name}</span>
                                <span className="text-[var(--text-muted)] text-[10px]">{tech.score} items</span>
                              </div>
                              <div className="w-full bg-[var(--bg-app)] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-indigo-500 h-full rounded-full"
                                  style={{ width: `${Math.max(8, pct)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {reposList.length > 0 && (
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                    {reposList.map((r, i) => (
                      <span key={i} className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-2 py-0.5 rounded font-mono">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Simulate Departure Button */}
                <button
                  onClick={() => handleSimulateDeparture(person)}
                  disabled={isSimulating}
                  className="w-full py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-strong)] text-xs font-medium text-[var(--text-primary)] hover:border-rose-500/40 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Simulating…</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-3.5 w-3.5 text-rose-400" />
                      <span>Simulate Departure</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Simulate Departure Impact Panel (Modal Overlay) ──────── */}
      {(simulation || simError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={closeSimulation}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white transition-colors z-10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {simError ? (
              <div className="p-8 space-y-4">
                <div className="flex items-center space-x-3 text-rose-300">
                  <AlertTriangle className="h-5 w-5 text-rose-400" />
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)] text-base">Simulation Failed</h4>
                    <p className="text-xs text-rose-300/80">{simError}</p>
                  </div>
                </div>
              </div>
            ) : simulation && (
              <div className="p-6 space-y-6">
                {/* Header — visually distinct "simulation" framing */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <UserMinus className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">DEPARTURE IMPACT SIMULATION</p>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                        Impact Assessment: {simulation.person}
                      </h3>
                    </div>
                  </div>

                  {/* Risk score hero */}
                  <div className="flex items-center space-x-5 p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                    <div className="text-center pr-5 border-r border-[var(--border-subtle)]">
                      <span className="text-3xl font-extrabold text-rose-400 font-mono">{simulation.riskScore}%</span>
                      <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase mt-0.5">Knowledge Risk</p>
                    </div>
                    <div className="flex-1 space-y-1 text-xs text-[var(--text-secondary)]">
                      <p><strong className="text-[var(--text-primary)] font-mono">{simulation.details.ownedItems}</strong> owned items at risk</p>
                      <p><strong className="text-[var(--text-primary)] font-mono">{simulation.commitCount}</strong> commits authored</p>
                      <p><strong className="text-[var(--text-primary)] font-mono">{simulation.affectedRepos.length}</strong> {simulation.affectedRepos.length === 1 ? 'repository' : 'repositories'} affected</p>
                    </div>
                  </div>
                </div>

                {/* 6 Risk Breakdown Bars */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Risk Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <BreakdownBar label="Ownership" value={simulation.breakdown?.ownership ?? 0} />
                    <BreakdownBar label="Dependency" value={simulation.breakdown?.dependency ?? 0} />
                    <BreakdownBar label="Activity" value={simulation.breakdown?.activity ?? 0} />
                    <BreakdownBar label="Documentation" value={simulation.breakdown?.documentation ?? 0} />
                    <BreakdownBar label="Expertise" value={simulation.breakdown?.expertise ?? 0} />
                    <BreakdownBar label="Pending Work" value={simulation.breakdown?.pendingWork ?? 0} />
                  </div>
                </div>

                {/* Affected Repos */}
                {(simulation.affectedRepos?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
                      Affected Repositories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {simulation.affectedRepos.map((repo, i) => (
                        <span key={i} className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded font-mono">
                          {repo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Technologies */}
                {(simulation.affectedTechnologies?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                      Affected Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {simulation.affectedTechnologies.map((tech, i) => (
                        <span key={i} className="text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-2.5 py-1 rounded font-mono">
                          {tech.name}
                          <span className="ml-1 text-[10px] text-[var(--text-muted)]">({tech.score})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owned Items Evidence */}
                {(simulation.evidence?.ownership?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      Owned Items at Risk ({simulation.evidence.ownership.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {simulation.evidence.ownership.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                          <span className="text-[var(--text-secondary)] font-mono truncate">{item.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono shrink-0 ml-2">{item.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── SECTION: RECOMMENDED SUCCESSORS & HANDOFF PLAN ──────────────── */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      <span>Recommended Successors & Handoff Plan</span>
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      Per-repository deterministic candidate ranking
                    </span>
                  </div>

                  {simulation.successorsByRepo && simulation.successorsByRepo.length > 0 ? (
                    <div className="space-y-4">
                      {simulation.successorsByRepo.map((repoPlan, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <FolderGit2 className="h-4 w-4 text-indigo-400 shrink-0" />
                              <span className="font-mono text-sm font-bold text-[var(--text-primary)] truncate">
                                {repoPlan.repoName}
                              </span>
                              {repoPlan.busFactor !== undefined && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold shrink-0 ${
                                    repoPlan.busFactor <= 1
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                                  }`}
                                >
                                  Bus Factor: {repoPlan.busFactor} {repoPlan.busFactor <= 1 ? '(SPOF)' : ''}
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[11px] font-medium px-2.5 py-0.5 rounded border shrink-0 ${
                                repoPlan.hasSuccessor
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {repoPlan.hasSuccessor ? 'Recommended Successor Identified' : 'Cross-Training Candidate Only'}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                            {repoPlan.explanation}
                          </p>

                          {repoPlan.candidates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {repoPlan.candidates.map((cand, cIdx) => (
                                <SuccessorCandidateCard key={cIdx} candidate={cand} />
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                              <span>No viable successor found for repository "{repoPlan.repoName}". No candidate with overlapping stack identified. Cross-skilling required.</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                      <p>No repository-level successor candidates identified for this profile.</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Cross-skilling recommended to build redundancy.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
