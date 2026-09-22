import React from 'react';

import { RISK_THRESHOLDS } from '../constants/riskThresholds';

export interface RiskGaugeProps {
  score: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  type?: 'radial' | 'bar' | 'dot';
  showLabel?: boolean;
  label?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  size = 'md',
  type = 'radial',
  showLabel = true,
  label,
}) => {
  const normalizedScore = Math.max(0, Math.min(100, score));

  // Risk levels aligned strictly to RISK_THRESHOLDS: Critical (≥60), High (≥40), Moderate (≥25), Low (<25)
  const getRiskTheme = (val: number) => {
    if (val >= RISK_THRESHOLDS.CRITICAL) {
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500',
        stroke: '#EF4444',
        badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        tag: 'CRITICAL',
      };
    }
    if (val >= RISK_THRESHOLDS.HIGH) {
      return {
        text: 'text-orange-400',
        bg: 'bg-orange-500',
        stroke: '#F97316',
        badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
        tag: 'HIGH RISK',
      };
    }
    if (val >= RISK_THRESHOLDS.MODERATE) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500',
        stroke: '#FBBF24',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        tag: 'MODERATE',
      };
    }
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
      stroke: '#10B981',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      tag: 'HEALTHY',
    };
  };

  const theme = getRiskTheme(normalizedScore);

  if (type === 'dot') {
    return (
      <div className="flex items-center space-x-1.5">
        <span className={`w-2 h-2 rounded-full ${theme.bg}`} />
        {showLabel && (
          <span className={`text-xs font-medium ${theme.text}`}>
            {normalizedScore}% {label ? `(${label})` : ''}
          </span>
        )}
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="space-y-1 w-full">
        {showLabel && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">{label || 'Risk Score'}</span>
            <span className={`font-bold ${theme.text}`}>{normalizedScore}%</span>
          </div>
        )}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bg}`}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>
    );
  }

  // Radial Ring Gauge
  const dimensions = {
    sm: { radius: 18, strokeWidth: 3.5, sizePx: 44, textClass: 'text-xs font-bold' },
    md: { radius: 28, strokeWidth: 5, sizePx: 68, textClass: 'text-base font-extrabold' },
    lg: { radius: 40, strokeWidth: 7, sizePx: 96, textClass: 'text-2xl font-black' },
  }[size];

  const circumference = 2 * Math.PI * dimensions.radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="flex items-center space-x-3 shrink-0">
      <div className="relative flex items-center justify-center" style={{ width: dimensions.sizePx, height: dimensions.sizePx }}>
        <svg className="transform -rotate-90" width={dimensions.sizePx} height={dimensions.sizePx}>
          <circle
            cx={dimensions.sizePx / 2}
            cy={dimensions.sizePx / 2}
            r={dimensions.radius}
            stroke="#1e293b"
            strokeWidth={dimensions.strokeWidth}
            fill="transparent"
          />
          <circle
            cx={dimensions.sizePx / 2}
            cy={dimensions.sizePx / 2}
            r={dimensions.radius}
            stroke={theme.stroke}
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className={`absolute ${dimensions.textClass} ${theme.text}`}>
          {normalizedScore}%
        </span>
      </div>
      {showLabel && (
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${theme.badge}`}>
            {theme.tag}
          </span>
          {label && <p className="text-xs text-slate-400 mt-1">{label}</p>}
        </div>
      )}
    </div>
  );
};
