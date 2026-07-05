import type { RuleResult, AIReviewResult, DocumentAnalysis } from "@/lib/types";
import { analyzeWithOpenAI, isOpenAIAvailable } from "@/lib/ai/openai-client";
import { analyzeWithFallback } from "@/lib/ai/fallback-analyzer";

interface DocumentInfo {
  type: string;
  fileName: string;
  extractedText?: string | null;
}

interface VendorInfo {
  companyName: string;
  legalName: string;
  country: string;
  registrationNumber: string;
  taxId: string;
  taxType: string;
  email: string;
  phone: string;
  address: string;
  bankAccountName: string;
  bankAccountNumber: string;
  ifscSwift: string;
}

/**
 * AI-powered or deterministic document consistency review.
 * Uses OpenAI if API key available, otherwise falls back to deterministic analysis.
 */
export async function runAIReview(
  vendor: VendorInfo,
  documents: DocumentInfo[]
): Promise<RuleResult> {
  let aiResult: AIReviewResult;

  try {
    if (isOpenAIAvailable()) {
      aiResult = await analyzeWithOpenAI(vendor, documents);
    } else {
      aiResult = analyzeWithFallback(vendor, documents);
    }
  } catch (error) {
    // If AI fails, fallback to deterministic
    try {
      aiResult = analyzeWithFallback(vendor, documents);
    } catch (fallbackError) {
      return {
        stepName: "Document Verification",
        status: "WARNING",
        message: `Document verification could not be completed: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: {
          error: String(error),
          fallbackError: String(fallbackError),
        },
        riskPoints: 5,
      };
    }
  }

  // Convert AI result to RuleResult
  let riskPoints = 0;
  let status: "PASSED" | "WARNING" | "FAILED";

  switch (aiResult.status) {
    case "match":
      status = "PASSED";
      riskPoints = 0;
      break;
    case "partial-match":
      status = "WARNING";
      riskPoints = 10;
      break;
    case "mismatch":
      status = "FAILED";
      // Calculate dynamic risk points based on critical field mismatches
      if (aiResult.fieldMatches) {
        aiResult.fieldMatches.forEach((m) => {
          if (m.isCritical && m.status === "mismatch") {
            if (m.fieldName === "taxId") riskPoints += 20;
            else if (m.fieldName === "registrationNumber") riskPoints += 15;
            else if (m.fieldName === "bankAccountNumber") riskPoints += 10;
            else riskPoints += 10; // other critical mismatches (companyName, legalName, bankAccountName, pan, ifscSwift)
          }
        });
      }
      // Fallback if fieldMatches is empty or not parsed
      if (riskPoints === 0) {
        riskPoints = 45;
      }
      break;
  }

  return {
    stepName: "Document Verification",
    status,
    message: aiResult.reasoning,
    details: {
      aiStatus: aiResult.status,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      documentAnalyses: aiResult.documentAnalyses,
      fieldMatches: aiResult.fieldMatches,
      crossDocConsistency: aiResult.crossDocConsistency,
      ocrTransparency: aiResult.ocrTransparency,
      engine: isOpenAIAvailable() ? "openai" : "deterministic",
    },
    riskPoints,
  };
}
