export const RISK_THRESHOLDS = {
  CRITICAL: 60,
  HIGH: 40,
  MODERATE: 25,
} as const;

export type RiskTier = keyof typeof RISK_THRESHOLDS;
