import React from 'react';
import { Calculator } from 'lucide-react';

interface TrustBadgeProps {
  label?: string;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ 
  label = 'Calculated from real graph data — not AI-generated',
  className = ''
}) => {
  return (
    <span 
      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-sm ${className}`}
      title="Deterministic algorithm execution: Exact Cypher graph traversal & Postgres metric calculation in code."
    >
      <Calculator className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
      <span>{label}</span>
    </span>
  );
};
