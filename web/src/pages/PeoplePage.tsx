import React, { useEffect, useState } from 'react';
import { getPeople, simulateDeparture as simulateDepartureApi, type PersonMetric, type DepartureSimulation } from '../lib/api';
import { Users, AlertTriangle, RefreshCw, GitCommit, FolderGit2, ShieldAlert, Award, UserMinus, X, Loader2, AlertCircle, Cpu } from 'lucide-react';

export const PeoplePage: React.FC = () => {
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
    fetchPeople();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-slate-900/80 rounded-xl border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <div>
              <h4 className="font-semibold text-white">Failed to Load People Metrics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchPeople}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
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
          <span className="text-slate-300 font-medium capitalize">{label}</span>
          <span className={`font-bold ${isHigh ? 'text-rose-400' : 'text-slate-400'}`}>{value.toFixed(1)}/10</span>
        </div>
        <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-400'}`}
            style={{ width: `${Math.max(4, pct)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            <span>People, Ownership & Knowledge Loss Risk</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Engineers ranked by Knowledge Loss Risk score, top skills, and repository contributions.
          </p>
        </div>
        <button
          onClick={fetchPeople}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg flex items-center space-x-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {people.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Users className="h-10 w-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-semibold text-slate-300">No Person Metrics Indexed Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Knowledge loss calculations run as part of the scheduled analytics job. Once team members have indexed graph data, profiles will populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map(person => {
            const risk = person.risk_score ?? 0;
            const isHighRisk = risk >= 40;

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
                className="glass-card glass-card-hover p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 flex items-center justify-center font-bold text-white shadow-md">
                        <div className="h-full w-full bg-slate-950 rounded-full flex items-center justify-center">
                          {(person?.person_name || person?.external_id || 'Person').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">{person?.person_name || person?.external_id || 'Person'}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {person?.external_id}</p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center space-x-1 ${
                        isHighRisk
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      <span>{risk}% Risk</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <GitCommit className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-slate-400">Commits: <strong className="text-white">{person.commit_count ?? 0}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-slate-400">Repos: <strong className="text-white">{reposList.length}</strong></span>
                    </div>
                  </div>

                  {techList.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <Award className="h-3 w-3 text-indigo-400" />
                        <span>Top Skills & Usage</span>
                      </div>
                      <div className="space-y-1.5">
                        {techList.slice(0, 4).map((tech, idx) => {
                          const pct = Math.round((tech.score / maxScore) * 100);
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-300 font-medium">{tech.name}</span>
                                <span className="text-slate-500 text-[10px]">{tech.score} items</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full"
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
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {reposList.map((r, i) => (
                      <span key={i} className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Simulate Departure Button */}
                <button
                  onClick={() => handleSimulateDeparture(person)}
                  disabled={isSimulating}
                  className="w-full py-2.5 bg-gradient-to-r from-rose-600/20 to-amber-600/20 hover:from-rose-600/30 hover:to-amber-600/30 border border-rose-500/30 hover:border-rose-500/50 text-xs font-semibold text-rose-200 hover:text-white rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Simulating…</span>
                    </>
                  ) : (
                    <>
                      <UserMinus className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0c1121] border border-rose-500/30 rounded-2xl shadow-2xl shadow-rose-500/10 relative">
            {/* Close button */}
            <button
              onClick={closeSimulation}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {simError ? (
              <div className="p-8 space-y-4">
                <div className="flex items-center space-x-3 text-rose-300">
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                  <div>
                    <h4 className="font-bold text-white text-lg">Simulation Failed</h4>
                    <p className="text-xs text-rose-300/80">{simError}</p>
                  </div>
                </div>
              </div>
            ) : simulation && (
              <div className="p-8 space-y-6">
                {/* Header — visually distinct "simulation" framing */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30">
                      <UserMinus className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">DEPARTURE SIMULATION</p>
                      <h3 className="text-xl font-extrabold text-white tracking-tight">
                        What if {simulation.person} left?
                      </h3>
                    </div>
                  </div>

                  {/* Risk score hero */}
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-rose-500/10 to-amber-500/10 rounded-xl border border-rose-500/20">
                    <div className="text-center">
                      <span className="text-4xl font-extrabold text-rose-400">{simulation.riskScore}%</span>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Knowledge Risk</p>
                    </div>
                    <div className="flex-1 space-y-1 text-xs text-slate-300">
                      <p><strong className="text-white">{simulation.details.ownedItems}</strong> owned items at risk</p>
                      <p><strong className="text-white">{simulation.commitCount}</strong> commits authored</p>
                      <p><strong className="text-white">{simulation.affectedRepos.length}</strong> {simulation.affectedRepos.length === 1 ? 'repository' : 'repositories'} affected</p>
                    </div>
                  </div>
                </div>

                {/* 6 Risk Breakdown Bars */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk Breakdown</h4>
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
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
                      Affected Repositories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {simulation.affectedRepos.map((repo, i) => (
                        <span key={i} className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1 rounded-lg font-medium">
                          {repo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Technologies */}
                {(simulation.affectedTechnologies?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-purple-400" />
                      Affected Technologies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {simulation.affectedTechnologies.map((tech, i) => (
                        <span key={i} className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-lg font-medium">
                          {tech.name}
                          <span className="ml-1 text-[10px] text-purple-400/60">({tech.score})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owned Items Evidence */}
                {(simulation.evidence?.ownership?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      Owned Items at Risk ({simulation.evidence.ownership.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {simulation.evidence.ownership.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-950/60 rounded-lg border border-slate-800/60">
                          <span className="text-slate-300 font-medium truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0 ml-2">{item.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
