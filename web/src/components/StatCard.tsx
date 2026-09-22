import React from 'react';
import { AnimatedNumber } from './AnimatedNumber';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--bg-panel)] p-4 rounded-lg border border-[var(--border-subtle)] transition-colors group relative ${
        onClick ? 'cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-baseline gap-2">
            <AnimatedNumber value={value} />
            {trend && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  trend.positive
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
              {subtext}
            </p>
          )}
        </div>

        <div className="p-2 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] group-hover:text-indigo-400 shrink-0 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
};
