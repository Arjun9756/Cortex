import React from 'react';

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
  accentColor = 'indigo',
  onClick,
}) => {
  const colorMap = {
    indigo: {
      border: 'hover:border-indigo-500/40',
      bgIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      glow: 'group-hover:shadow-indigo-500/10',
    },
    emerald: {
      border: 'hover:border-emerald-500/40',
      bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'group-hover:shadow-emerald-500/10',
    },
    amber: {
      border: 'hover:border-amber-500/40',
      bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'group-hover:shadow-amber-500/10',
    },
    rose: {
      border: 'hover:border-rose-500/40',
      bgIcon: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'group-hover:shadow-rose-500/10',
    },
    cyan: {
      border: 'hover:border-cyan-500/40',
      bgIcon: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      glow: 'group-hover:shadow-cyan-500/10',
    },
    purple: {
      border: 'hover:border-purple-500/40',
      bgIcon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      glow: 'group-hover:shadow-purple-500/10',
    },
  };

  const selectedColor = colorMap[accentColor] || colorMap.indigo;

  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 rounded-2xl border border-slate-800/80 transition-all duration-200 group relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${selectedColor.border} ${selectedColor.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-2">
            {value}
            {trend && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  trend.positive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-400 bg-rose-500/10'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-[11px] text-slate-400/90 leading-tight">
              {subtext}
            </p>
          )}
        </div>

        <div
          className={`p-2.5 rounded-xl border ${selectedColor.bgIcon} shrink-0 transition-transform group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};
