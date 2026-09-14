import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SuccessorCandidate } from '../lib/api';

interface SuccessorCandidateCardProps {
  candidate: SuccessorCandidate | {
    name: string;
    score: number;
    category?: 'recommended_successor' | 'cross_training_candidate';
    isOverloaded?: boolean;
    warningLabel?: string;
    rationale: string;
    sharedTechnologies?: string[];
    sharedRepositories?: string[];
    capacityScore?: number;
    breakdown?: {
      workloadCapacityScore?: number;
      [key: string]: any;
    };
    factors?: {
      sharedTechnologies?: string[];
      [key: string]: any;
    };
  };
}

export const SuccessorCandidateCard: React.FC<SuccessorCandidateCardProps> = ({ candidate }) => {
  const cand = candidate as any;
  const isCrossTraining = cand.category === 'cross_training_candidate' || 
    (cand.sharedRepositories?.length === 0 && !cand.category);
  const isOverloaded = Boolean(cand.isOverloaded || cand.warningLabel);

  const sharedTechList: string[] = cand.factors?.sharedTechnologies || cand.sharedTechnologies || [];
  const capacity: number = cand.breakdown?.workloadCapacityScore ?? cand.capacityScore ?? 100;

  return (
    <div
      className={`p-4 rounded-xl bg-[#090d18] border transition-all space-y-2.5 ${
        isOverloaded
          ? 'border-rose-500/40 bg-rose-950/10'
          : isCrossTraining
          ? 'border-amber-500/30 hover:border-amber-500/50'
          : 'border-slate-800/90 hover:border-emerald-500/40'
      }`}
    >
      {/* Overloaded Warning Banner */}
      {candidate.warningLabel && (
        <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span>{candidate.warningLabel}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2.5 min-w-0">
          <div
            className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
              isOverloaded
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                : isCrossTraining
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {candidate.name.charAt(0)}
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="font-bold text-white text-sm block leading-tight truncate">
              {candidate.name}
            </span>
            <span
              className={`text-[10px] font-semibold block leading-tight ${
                isOverloaded
                  ? 'text-rose-400'
                  : isCrossTraining
                  ? 'text-amber-400/90'
                  : 'text-emerald-400/90'
              }`}
            >
              {isOverloaded
                ? 'Overloaded Contributor (3+ SPOFs)'
                : isCrossTraining
                ? 'Cross-Training Candidate — No Direct Repository Experience'
                : 'Recommended Successor — Direct Repository Experience'}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
            isOverloaded
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : isCrossTraining
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {candidate.score}% Match
        </span>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
        {candidate.rationale}
      </p>

      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
        <span className="truncate pr-2">
          Shared Tech: <strong className="text-purple-300">{sharedTechList.length > 0 ? sharedTechList.join(', ') : 'General stack'}</strong>
        </span>
        <span className="shrink-0">
          Capacity: <strong className={isOverloaded ? 'text-rose-300' : 'text-cyan-300'}>{capacity}%</strong>
        </span>
      </div>
    </div>
  );
};
