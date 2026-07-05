import { prisma } from "@/lib/db";
import { sleep } from "@/lib/utils";
import type {
  ValidationStepEvent,
  ValidationResult,
  ValidationIssue,
  RuleResult,
  VendorFormData,
} from "@/lib/types";

import { validateRequiredFields } from "./rules/required-fields";
import { validateRequiredDocuments } from "./rules/required-documents";
import { validateTaxId } from "./rules/tax-id-validation";
import { validateIfscSwift } from "./rules/ifsc-validation";
import { validateEmail } from "./rules/email-validation";
import { validateCompanyNameMatch } from "./rules/company-name-match";
import { validateBankConsistency } from "./rules/bank-consistency";
import { detectDuplicates } from "./rules/duplicate-detection";
import { calculateRiskScore } from "./rules/risk-scoring";
import { runAIReview } from "./rules/ai-review";

/**
 * Random delay to make each validation step feel realistic
 */
function randomDelay(): number {
  return Math.floor(Math.random() * 500) + 300; // 300-800ms
}

/**
 * Convert a RuleResult to a ValidationStepEvent
 */
function toStepEvent(result: RuleResult, duration: number): ValidationStepEvent {
  return {
    stepName: result.stepName,
    status: result.status,
    message: result.message,
    details: result.details,
    duration,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convert a RuleResult to a ValidationIssue (only if it has risk)
 */
function toIssue(result: RuleResult): ValidationIssue | null {
  if (result.status === "PASSED" || result.status === "SKIPPED") return null;

  return {
    stepName: result.stepName,
    severity:
      result.status === "FAILED"
        ? "error"
        : result.status === "WARNING"
          ? "warning"
          : "info",
    message: result.message,
    details: result.details,
  };
}

/**
 * Run a single validation step: records to DB, emits SSE event, returns result
 */
async function executeStep(
  runId: string,
  stepOrder: number,
  executeFn: () => RuleResult | Promise<RuleResult>,
  onStep: (step: ValidationStepEvent) => void
): Promise<RuleResult> {
  const delay = randomDelay();

  // Create step as RUNNING in DB
  const step = await prisma.validationStep.create({
    data: {
      runId,
      stepName: "Initializing...",
      status: "RUNNING",
      stepOrder,
    },
  });

  // Emit RUNNING event
  onStep({
    stepName: "Processing...",
    status: "RUNNING",
    message: "Step in progress...",
    timestamp: new Date().toISOString(),
  });

  // Simulate realistic processing time
  await sleep(delay);

  const startTime = Date.now();
  const result = await executeFn();
  const duration = Date.now() - startTime + delay;

  // Update step in DB
  await prisma.validationStep.update({
    where: { id: step.id },
    data: {
      stepName: result.stepName,
      status: result.status,
      message: result.message,
      details: result.details ? JSON.stringify(result.details) : null,
      duration,
    },
  });

  // Emit completed event
  const event = toStepEvent(result, duration);
  onStep(event);

  return result;
}

/**
 * Main validation pipeline orchestrator.
 * Runs all 10 validation rules sequentially, recording each step to DB,
 * emitting SSE events, and computing the final risk score and decision.
 */
export async function runValidationPipeline(
  vendorId: string,
  onStep: (step: ValidationStepEvent) => void
): Promise<ValidationResult> {
  // Fetch vendor with documents
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    include: { documents: true },
  });

  const vendorData: VendorFormData = {
    companyName: vendor.companyName,
    legalName: vendor.legalName,
    country: vendor.country,
    registrationNumber: vendor.registrationNumber,
    taxId: vendor.taxId,
    taxType: vendor.taxType,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    bankAccountName: vendor.bankAccountName,
    bankAccountNumber: vendor.bankAccountNumber,
    ifscSwift: vendor.ifscSwift,
    website: vendor.website || undefined,
  };

  // Create validation run
  const run = await prisma.validationRun.create({
    data: {
      vendorId,
      status: "RUNNING",
    },
  });

  const allResults: RuleResult[] = [];
  const issues: ValidationIssue[] = [];
  let stepOrder = 0;

  try {
    // ── Step 1: Required Fields ──
    const fieldsResult = await executeStep(
      run.id,
      ++stepOrder,
      () => validateRequiredFields(vendorData),
      onStep
    );
    allResults.push(fieldsResult);
    const fieldIssue = toIssue(fieldsResult);
    if (fieldIssue) issues.push(fieldIssue);

    // ── Step 2: Required Documents ──
    const docsResult = await executeStep(
      run.id,
      ++stepOrder,
      () =>
        validateRequiredDocuments(
          vendor.documents.map((d) => ({ type: d.type, fileName: d.fileName }))
        ),
      onStep
    );
    allResults.push(docsResult);
    const docIssue = toIssue(docsResult);
    if (docIssue) issues.push(docIssue);

    // ── Step 3: Tax ID Validation ──
    const taxResult = await executeStep(
      run.id,
      ++stepOrder,
      () => validateTaxId(vendor.taxId, vendor.taxType, vendor.country),
      onStep
    );
    allResults.push(taxResult);
    const taxIssue = toIssue(taxResult);
    if (taxIssue) issues.push(taxIssue);

    // ── Step 4: IFSC/SWIFT Validation ──
    const ifscResult = await executeStep(
      run.id,
      ++stepOrder,
      () => validateIfscSwift(vendor.ifscSwift),
      onStep
    );
    allResults.push(ifscResult);
    const ifscIssue = toIssue(ifscResult);
    if (ifscIssue) issues.push(ifscIssue);

    // ── Step 5: Email Validation ──
    const emailResult = await executeStep(
      run.id,
      ++stepOrder,
      () => validateEmail(vendor.email),
      onStep
    );
    allResults.push(emailResult);
    const emailIssue = toIssue(emailResult);
    if (emailIssue) issues.push(emailIssue);

    // ── Step 6: Company Name Match ──
    const nameResult = await executeStep(
      run.id,
      ++stepOrder,
      () => validateCompanyNameMatch(vendor.companyName, vendor.legalName),
      onStep
    );
    allResults.push(nameResult);
    const nameIssue = toIssue(nameResult);
    if (nameIssue) issues.push(nameIssue);

    // ── Step 7: Bank Account Consistency ──
    const bankResult = await executeStep(
      run.id,
      ++stepOrder,
      () =>
        validateBankConsistency(
          vendor.bankAccountName,
          vendor.companyName,
          vendor.legalName
        ),
      onStep
    );
    allResults.push(bankResult);
    const bankIssue = toIssue(bankResult);
    if (bankIssue) issues.push(bankIssue);

    // ── Step 8: Duplicate Detection ──
    const dupResult = await executeStep(
      run.id,
      ++stepOrder,
      () =>
        detectDuplicates(
          vendorId,
          vendor.taxId,
          vendor.registrationNumber,
          vendor.companyName
        ),
      onStep
    );
    allResults.push(dupResult);
    const dupIssue = toIssue(dupResult);
    if (dupIssue) issues.push(dupIssue);

    // ── Step 9: AI Document Review ──
    const aiResult = await executeStep(
      run.id,
      ++stepOrder,
      () =>
        runAIReview(
          {
            companyName: vendor.companyName,
            legalName: vendor.legalName,
            country: vendor.country,
            registrationNumber: vendor.registrationNumber,
            taxId: vendor.taxId,
            taxType: vendor.taxType,
            email: vendor.email,
            phone: vendor.phone,
            address: vendor.address,
            bankAccountName: vendor.bankAccountName,
            bankAccountNumber: vendor.bankAccountNumber,
            ifscSwift: vendor.ifscSwift,
          },
          vendor.documents.map((d) => ({
            type: d.type,
            fileName: d.fileName,
            extractedText: d.extractedText,
          }))
        ),
      onStep
    );
    allResults.push(aiResult);
    const aiIssue = toIssue(aiResult);
    if (aiIssue) issues.push(aiIssue);

    // ── Step 10: Risk Score Calculation ──
    const riskResult = await executeStep(
      run.id,
      ++stepOrder,
      () => calculateRiskScore(allResults),
      onStep
    );
    // The risk result contains the decision
    const riskData = calculateRiskScore(allResults);

    // Build final reasoning
    const reasoning = buildReasoning(allResults, riskData);
    const decision = riskData.decision as "APPROVED" | "PENDING" | "REJECTED";
    const riskScore = (riskData.details?.cappedScore as number) || 0;

    // Complete the validation run
    await prisma.validationRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Update vendor status
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: decision,
        riskScore,
        decision,
        reasoning,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        vendorId,
        action: "VALIDATION_COMPLETED",
        details: JSON.stringify({
          runId: run.id,
          decision,
          riskScore,
          issueCount: issues.length,
        }),
      },
    });

    const result: ValidationResult = {
      issues,
      riskScore,
      decision,
      reasoning,
    };

    return result;
  } catch (error) {
    // Mark run as failed
    await prisma.validationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });

    // Emit error event
    onStep({
      stepName: "Pipeline Error",
      status: "FAILED",
      message: `Validation pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: new Date().toISOString(),
    });

    // Update vendor status back to PENDING
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: "PENDING" },
    });

    throw error;
  }
}

/**
 * Build a human-readable reasoning summary from all results
 */
function buildReasoning(
  allResults: RuleResult[],
  riskData: ReturnType<typeof calculateRiskScore>
): string {
  const lines: string[] = [];
  lines.push(`=== Vendor Validation Report ===`);
  lines.push(`Risk Score: ${riskData.details?.cappedScore}/100`);
  lines.push(`Decision: ${riskData.decision}`);
  lines.push("");

  for (const result of allResults) {
    const icon =
      result.status === "PASSED"
        ? "✓"
        : result.status === "WARNING"
          ? "⚠"
          : result.status === "FAILED"
            ? "✗"
            : "○";
    lines.push(`${icon} ${result.stepName}: ${result.message}`);
  }

  lines.push("");
  if (riskData.riskFactors.length > 0) {
    lines.push("Risk Factors:");
    for (const factor of riskData.riskFactors) {
      lines.push(`  - ${factor.name}: +${factor.score} points — ${factor.description}`);
    }
  } else {
    lines.push("No risk factors identified.");
  }

  return lines.join("\n");
}
