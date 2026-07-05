import { prisma } from "@/lib/db";
import { runValidationPipeline } from "@/lib/validation/engine";
import type { ValidationStepEvent } from "@/lib/types";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/vendors/[id]/process">
): Promise<Response> {
  const { id } = await ctx.params;

  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id },
  });

  if (!vendor) {
    return Response.json(
      { error: `Vendor with id "${id}" not found.` },
      { status: 404 }
    );
  }

  // Set vendor status to PROCESSING
  await prisma.vendor.update({
    where: { id },
    data: { status: "PROCESSING" },
  });

  // Create audit log for processing start
  await prisma.auditLog.create({
    data: {
      vendorId: id,
      action: "VALIDATION_STARTED",
      details: JSON.stringify({
        companyName: vendor.companyName,
        previousStatus: vendor.status,
      }),
    },
  });

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: ValidationStepEvent | Record<string, unknown>) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream may have been closed
        }
      };

      try {
        // Send initial event
        sendEvent({
          type: "start",
          vendorId: id,
          companyName: vendor.companyName,
          timestamp: new Date().toISOString(),
        });

        // Run the validation pipeline with SSE callback
        const result = await runValidationPipeline(id, (step: ValidationStepEvent) => {
          sendEvent({
            type: "step",
            ...step,
          });
        });

        // Send final result event
        sendEvent({
          type: "complete",
          decision: result.decision,
          riskScore: result.riskScore,
          reasoning: result.reasoning,
          issues: result.issues,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        // Send error event
        sendEvent({
          type: "error",
          error: error instanceof Error ? error.message : "Validation pipeline failed",
          timestamp: new Date().toISOString(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
