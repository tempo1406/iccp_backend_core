export interface ResolvedKpiWeights {
  weightPointCompletion: number;
  weightOnTime: number;
  weightOtContribution: number;
}

export interface ResolvedBonusRules {
  bonusEnabled: boolean;
  bonusOnTimeTask: number;
  bonusEarlyTaskHours: number;
  bonusEarlyTask: number;
  bonusZeroOverdue: number;
  bonusMaxCap: number;
  bonusOtPerEffectiveHour: number;
}

export function calcBasePerformanceScore(
  pointCompletionRate: number,
  onTimeRate: number,
  otContributionScore: number,
  weights: ResolvedKpiWeights,
): number {
  return Math.min(
    100,
    pointCompletionRate * weights.weightPointCompletion +
      onTimeRate * weights.weightOnTime +
      otContributionScore * weights.weightOtContribution,
  );
}

export function calcBonusPoints(
  stats: {
    onTimeTasks: number;
    earlyTasks: number;
    hasZeroOverdue: boolean;
    effectiveOtHours: number;
  },
  rules: ResolvedBonusRules,
): number {
  if (!rules.bonusEnabled) return 0;

  const raw =
    stats.onTimeTasks * rules.bonusOnTimeTask +
    stats.earlyTasks * rules.bonusEarlyTask +
    (stats.hasZeroOverdue ? rules.bonusZeroOverdue : 0) +
    stats.effectiveOtHours * rules.bonusOtPerEffectiveHour;

  return Math.min(rules.bonusMaxCap, raw);
}

export function calcFinalScore(baseScore: number, bonusPoints: number): number {
  return Math.min(100, Math.round((baseScore + bonusPoints) * 10) / 10);
}

export function calcOtContributionScore(
  effectiveOtHours: number,
  expectedWorkingHours: number,
): number {
  if (!expectedWorkingHours || !effectiveOtHours) return 0;
  return Math.min(
    100,
    Math.round((effectiveOtHours / expectedWorkingHours) * 100),
  );
}

export function calcRates(stats: {
  totalAssigned: number;
  completedTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  totalEstimatePoints: number;
  totalActualPoints: number;
}) {
  const estimatePoints = stats.totalEstimatePoints || 1;

  const completionRate = stats.totalAssigned
    ? Math.round((stats.completedTasks / stats.totalAssigned) * 100)
    : 0;
  const onTimeRate = stats.completedTasks
    ? Math.round((stats.onTimeTasks / stats.completedTasks) * 100)
    : 0;
  const overdueRate = stats.totalAssigned
    ? Math.round((stats.overdueTasks / stats.totalAssigned) * 100)
    : 0;
  const pointCompletionRate = Math.round(
    (stats.totalActualPoints / estimatePoints) * 100,
  );

  return { completionRate, onTimeRate, overdueRate, pointCompletionRate };
}
