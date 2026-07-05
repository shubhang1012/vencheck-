import type { RuleResult, RiskFactor, ValidationStepStatus } from "@/lib/types";

/**
 * Calculate weighted risk score from all previous validation results.
 * Risk thresholds: 0-20 Approved, 21-60 Pending, 61+ Rejected
 */
export function calculateRiskScore(
  previousResults: RuleResult[]
): RuleResult & { riskFactors: RiskFactor[]; decision: string } {
  const riskFactors: RiskFactor[] = [];
  let totalRisk = 0;

  for (const result of previousResults) {
    if (result.riskPoints > 0) {
      riskFactors.push({
        name: result.stepName,
        score: result.riskPoints,
        description: result.message,
      });
      totalRisk += result.riskPoints;
    }
  }

  // Cap at 100
  const cappedScore = Math.min(totalRisk, 100);

  // Determine decision
  let decision: string;
  let status: ValidationStepStatus;
  let message: string;

  if (cappedScore <= 20) {
    decision = "APPROVED";
    status = "PASSED";
    message = `Risk score: ${cappedScore}/100 — LOW RISK. Vendor approved for onboarding.`;
  } else if (cappedScore <= 60) {
    decision = "PENDING";
    status = "WARNING";
    message = `Risk score: ${cappedScore}/100 — MEDIUM RISK. Manual review required.`;
  } else {
    decision = "REJECTED";
    status = "FAILED";
    message = `Risk score: ${cappedScore}/100 — HIGH RISK. Vendor application rejected.`;
  }

  return {
    stepName: "Risk Score Calculation",
    status,
    message,
    details: {
      rawScore: totalRisk,
      cappedScore,
      decision,
      riskFactors,
      thresholds: {
        approved: "0-20",
        pending: "21-60",
        rejected: "61+",
      },
    },
    riskPoints: 0, // Meta-step, doesn't contribute additional risk
    riskFactors,
    decision,
  };
}
