import type { RuleResult, ValidationStepStatus } from "@/lib/types";
import { prisma } from "@/lib/db";
import { compareCompanyNames } from "./company-name-match";

/**
 * Detect duplicate vendors in the database
 */
export async function detectDuplicates(
  vendorId: string,
  taxId: string,
  registrationNumber: string,
  companyName: string
): Promise<RuleResult> {
  const duplicates: {
    field: string;
    matchedVendorId: string;
    matchedCompanyName: string;
    similarity?: number;
  }[] = [];

  try {
    // Check for exact taxId match (excluding current vendor)
    const taxIdMatches = await prisma.vendor.findMany({
      where: {
        taxId: taxId,
        id: { not: vendorId },
      },
      select: { id: true, companyName: true, taxId: true },
    });

    for (const match of taxIdMatches) {
      duplicates.push({
        field: "taxId",
        matchedVendorId: match.id,
        matchedCompanyName: match.companyName,
      });
    }

    // Check for exact registrationNumber match
    const regMatches = await prisma.vendor.findMany({
      where: {
        registrationNumber: registrationNumber,
        id: { not: vendorId },
      },
      select: { id: true, companyName: true, registrationNumber: true },
    });

    for (const match of regMatches) {
      // Avoid double-counting if same vendor matched on taxId already
      if (!duplicates.some((d) => d.matchedVendorId === match.id)) {
        duplicates.push({
          field: "registrationNumber",
          matchedVendorId: match.id,
          matchedCompanyName: match.companyName,
        });
      }
    }

    // Check for similar company names (fetch all other vendors and compare)
    const allOtherVendors = await prisma.vendor.findMany({
      where: { id: { not: vendorId } },
      select: { id: true, companyName: true },
    });

    for (const otherVendor of allOtherVendors) {
      // Skip if already flagged
      if (duplicates.some((d) => d.matchedVendorId === otherVendor.id)) {
        continue;
      }

      const { score } = compareCompanyNames(companyName, otherVendor.companyName);
      if (score >= 85) {
        duplicates.push({
          field: "companyName",
          matchedVendorId: otherVendor.id,
          matchedCompanyName: otherVendor.companyName,
          similarity: score,
        });
      }
    }
  } catch (error) {
    return {
      stepName: "Duplicate Detection",
      status: "WARNING",
      message: `Error during duplicate detection: ${error instanceof Error ? error.message : "Unknown error"}`,
      details: { error: String(error) },
      riskPoints: 0,
    };
  }

  const hasDuplicates = duplicates.length > 0;
  let status: ValidationStepStatus;
  let message: string;
  const riskPoints = hasDuplicates ? 25 : 0;

  if (!hasDuplicates) {
    status = "PASSED";
    message = "No duplicate vendors detected.";
  } else {
    status = "FAILED";
    const fields = [...new Set(duplicates.map((d) => d.field))].join(", ");
    message = `${duplicates.length} potential duplicate(s) found matching on: ${fields}`;
  }

  return {
    stepName: "Duplicate Detection",
    status,
    message,
    details: {
      duplicatesFound: duplicates.length,
      duplicates,
    },
    riskPoints,
  };
}
