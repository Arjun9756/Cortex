import React from 'react';

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

  // Risk levels: < 40 Low (emerald), 40-70 Medium (amber), > 70 High/Critical (rose)
  const getRiskTheme = (val: number) => {
    if (val >= 70) {
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500',
        stroke: '#f43f5e',
        badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        tag: 'HIGH RISK',
      };
    }
    if (val >= 40) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500',
        stroke: '#f59e0b',
        badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        tag: 'MODERATE',
      };
    }
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
      stroke: '#10b981',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      tag: 'HEALTHY',
    };
  };

  const theme = getRiskTheme(normalizedScore);

  if (type === 'dot') {
    return (
      <div className="flex items-center space-x-2">
        <span className={`w-2.5 h-2.5 rounded-full ${theme.bg} animate-pulse`} />
        {showLabel && (
          <span className={`text-xs font-semibold ${theme.text}`}>
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
