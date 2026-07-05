import type { RuleResult, ValidationStepStatus } from "@/lib/types";
import { compareCompanyNames } from "./company-name-match";

/**
 * Validate bank account name consistency with company/legal name
 */
export function validateBankConsistency(
  bankAccountName: string,
  companyName: string,
  legalName: string
): RuleResult {
  if (!bankAccountName) {
    return {
      stepName: "Bank Account Consistency",
      status: "SKIPPED",
      message: "Bank account name is empty, skipping consistency check.",
      details: { bankAccountName, companyName, legalName },
      riskPoints: 0,
    };
  }

  // Compare bank account name with both company name and legal name
  const companyComparison = compareCompanyNames(bankAccountName, companyName);
  const legalComparison = compareCompanyNames(bankAccountName, legalName);

  // Use the best match between the two comparisons
  const bestScore = Math.max(companyComparison.score, legalComparison.score);
  const bestMatchWith =
    companyComparison.score >= legalComparison.score
      ? "companyName"
      : "legalName";

  let status: ValidationStepStatus;
  let message: string;
  let riskPoints: number;

  if (bestScore > 80) {
    status = "PASSED";
    message = `Bank account name matches ${bestMatchWith} (${bestScore}% similarity).`;
    riskPoints = 0;
  } else if (bestScore >= 60) {
    status = "WARNING";
    message = `Bank account name partially matches ${bestMatchWith} (${bestScore}% similarity). Manual review recommended.`;
    riskPoints = 10;
  } else {
    status = "FAILED";
    message = `Bank account name "${bankAccountName}" does not match company name "${companyName}" or legal name "${legalName}" (best: ${bestScore}% similarity).`;
    riskPoints = 15;
  }

  return {
    stepName: "Bank Account Consistency",
    status,
    message,
    details: {
      bankAccountName,
      companyName,
      legalName,
      companyNameSimilarity: companyComparison.score,
      legalNameSimilarity: legalComparison.score,
      bestScore,
      bestMatchWith,
      normalizedBankName: companyComparison.normalizedName1,
      normalizedCompanyName: companyComparison.normalizedName2,
      normalizedLegalName: legalComparison.normalizedName2,
    },
    riskPoints,
  };
}
