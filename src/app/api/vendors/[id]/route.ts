import { prisma } from "@/lib/db";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/vendors/[id]">
): Promise<Response> {
  try {
    const { id } = await ctx.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
        },
        validationRuns: {
          orderBy: { startedAt: "desc" },
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

    const latestRun = vendor.validationRuns[0];
    const issues = latestRun
      ? latestRun.steps
          .filter((step) => step.status === "FAILED" || step.status === "WARNING")
          .map((step) => `${step.stepName}: ${step.message || ""}`)
      : [];

    // Parse JSON details in validation steps
    const vendorWithParsedDetails = {
      ...vendor,
      issues,
      documents: vendor.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.mimeType,
        documentType: doc.type,
        url: doc.filePath,
        extractedText: doc.extractedText,
        uploadedAt: doc.createdAt,
      })),
      validationSteps: vendor.validationRuns[0]?.steps.map((step) => ({
        name: step.stepName,
        status: step.status.toLowerCase(),
        message: step.message,
        details: step.details ? step.details : null, // JSON is already stringified in DB, or parse it?
        duration: step.duration,
        timestamp: step.timestamp,
      })) || [],
      auditTrail: vendor.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details ? log.details : null,
        timestamp: log.timestamp,
      })),
    };

    return Response.json({ vendor: vendorWithParsedDetails });
  } catch (error) {
    console.error("GET /api/vendors/[id] error:", error);
    return Response.json(
      {
        error: "Failed to fetch vendor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
