import { prisma } from "@/lib/db";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/vendors/[id]/report">
): Promise<Response> {
  try {
    const { id } = await ctx.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "asc" },
        },
        validationRuns: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            steps: {
              orderBy: { stepOrder: "asc" },
            },
          },
        },
        auditLogs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!vendor) {
      return Response.json(
        { error: `Vendor with id "${id}" not found.` },
        { status: 404 }
      );
    }

    // Build text report
    const lines: string[] = [];
    const divider = "═".repeat(60);
    const subDivider = "─".repeat(60);

    lines.push(divider);
    lines.push("  VENDOR ONBOARDING VALIDATION REPORT");
    lines.push(divider);
    lines.push("");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Vendor ID: ${vendor.id}`);
    lines.push("");

    // ── Vendor Information ──
    lines.push(subDivider);
    lines.push("  VENDOR INFORMATION");
    lines.push(subDivider);
    lines.push(`  Company Name:        ${vendor.companyName}`);
    lines.push(`  Legal Name:          ${vendor.legalName}`);
    lines.push(`  Country:             ${vendor.country}`);
    lines.push(`  Registration Number: ${vendor.registrationNumber}`);
    lines.push(`  Tax ID:              ${vendor.taxId}`);
    lines.push(`  Tax Type:            ${vendor.taxType}`);
    lines.push(`  Email:               ${vendor.email}`);
    lines.push(`  Phone:               ${vendor.phone}`);
    lines.push(`  Address:             ${vendor.address}`);
    lines.push(`  Bank Account Name:   ${vendor.bankAccountName}`);
    lines.push(`  Bank Account Number: ${vendor.bankAccountNumber}`);
    lines.push(`  IFSC/SWIFT:          ${vendor.ifscSwift}`);
    lines.push(`  Website:             ${vendor.website || "N/A"}`);
    lines.push("");

    // ── Status & Risk ──
    lines.push(subDivider);
    lines.push("  DECISION SUMMARY");
    lines.push(subDivider);
    lines.push(`  Status:              ${vendor.status}`);
    lines.push(`  Risk Score:          ${vendor.riskScore}/100`);
    lines.push(`  Decision:            ${vendor.decision || "Pending"}`);
    lines.push("");

    if (vendor.reasoning) {
      lines.push("  Reasoning:");
      for (const reasonLine of vendor.reasoning.split("\n")) {
        lines.push(`    ${reasonLine}`);
      }
      lines.push("");
    }

    // ── Documents ──
    lines.push(subDivider);
    lines.push("  UPLOADED DOCUMENTS");
    lines.push(subDivider);
    if (vendor.documents.length === 0) {
      lines.push("  No documents uploaded.");
    } else {
      for (const doc of vendor.documents) {
        lines.push(`  [${doc.type}] ${doc.fileName}`);
        lines.push(`    MIME: ${doc.mimeType}`);
        lines.push(`    Uploaded: ${doc.createdAt.toISOString()}`);
        if (doc.extractedText) {
          const preview =
            doc.extractedText.length > 100
              ? doc.extractedText.substring(0, 100) + "..."
              : doc.extractedText;
          lines.push(`    Extracted Text: ${preview}`);
        }
        lines.push("");
      }
    }

    // ── Validation Steps ──
    const latestRun = vendor.validationRuns[0];
    if (latestRun) {
      lines.push(subDivider);
      lines.push("  LATEST VALIDATION RUN");
      lines.push(subDivider);
      lines.push(`  Run ID:     ${latestRun.id}`);
      lines.push(`  Status:     ${latestRun.status}`);
      lines.push(`  Started:    ${latestRun.startedAt.toISOString()}`);
      lines.push(
        `  Completed:  ${latestRun.completedAt?.toISOString() || "In progress"}`
      );
      lines.push("");

      if (latestRun.steps.length > 0) {
        lines.push("  Validation Steps:");
        lines.push("");
        for (const step of latestRun.steps) {
          const icon =
            step.status === "PASSED"
              ? "✓"
              : step.status === "WARNING"
                ? "⚠"
                : step.status === "FAILED"
                  ? "✗"
                  : step.status === "RUNNING"
                    ? "▶"
                    : "○";
          lines.push(
            `  ${icon} Step ${step.stepOrder}: ${step.stepName} [${step.status}]`
          );
          if (step.message) {
            lines.push(`    ${step.message}`);
          }
          if (step.duration !== null && step.duration !== undefined) {
            lines.push(`    Duration: ${step.duration}ms`);
          }

          // Parse and display details
          if (step.details) {
            try {
              const details = JSON.parse(step.details);
              const detailStr = JSON.stringify(details, null, 2)
                .split("\n")
                .map((l) => `      ${l}`)
                .join("\n");
              lines.push(`    Details:`);
              lines.push(detailStr);
            } catch {
              lines.push(`    Details: ${step.details}`);
            }
          }
          lines.push("");
        }
      }
    } else {
      lines.push(subDivider);
      lines.push("  No validation runs found.");
      lines.push(subDivider);
    }

    // ── Audit Trail ──
    lines.push(subDivider);
    lines.push("  AUDIT TRAIL");
    lines.push(subDivider);
    if (vendor.auditLogs.length === 0) {
      lines.push("  No audit log entries.");
    } else {
      for (const log of vendor.auditLogs) {
        lines.push(
          `  [${log.timestamp.toISOString()}] ${log.action}`
        );
        if (log.details) {
          try {
            const details = JSON.parse(log.details);
            lines.push(`    ${JSON.stringify(details)}`);
          } catch {
            lines.push(`    ${log.details}`);
          }
        }
      }
    }

    lines.push("");
    lines.push(divider);
    lines.push("  END OF REPORT");
    lines.push(divider);

    const reportText = lines.join("\n");
    const fileName = `vendor-report-${vendor.companyName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.txt`;

    return new Response(reportText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/vendors/[id]/report error:", error);
    return Response.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
