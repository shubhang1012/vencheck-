import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    // Run all database calls in parallel to eliminate sequential round-trip latency
    const [
      totalVendors,
      approvedCount,
      pendingCount,
      rejectedCount,
      processingCount,
      riskAgg,
      completedRuns,
      recentVendors,
      lowRiskCount,
      mediumRiskCount,
      highRiskCount
    ] = await Promise.all([
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: "APPROVED" } }),
      prisma.vendor.count({ where: { status: "PENDING" } }),
      prisma.vendor.count({ where: { status: "REJECTED" } }),
      prisma.vendor.count({ where: { status: "PROCESSING" } }),
      prisma.vendor.aggregate({
        _avg: { riskScore: true },
      }),
      prisma.validationRun.findMany({
        where: {
          status: "COMPLETED",
          completedAt: { not: null },
        },
        select: {
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.vendor.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          companyName: true,
          country: true,
          status: true,
          riskScore: true,
          createdAt: true,
          _count: {
            select: { documents: true },
          },
        },
      }),
      prisma.vendor.count({
        where: { riskScore: { lte: 20 } },
      }),
      prisma.vendor.count({
        where: { riskScore: { gt: 20, lte: 60 } },
      }),
      prisma.vendor.count({
        where: { riskScore: { gt: 60 } },
      }),
    ]);

    const averageRiskScore = Math.round(riskAgg._avg.riskScore ?? 0);

    let averageProcessingTime = 0;
    if (completedRuns.length > 0) {
      const totalMs = completedRuns.reduce((sum, run) => {
        if (run.completedAt) {
          return sum + (run.completedAt.getTime() - run.startedAt.getTime());
        }
        return sum;
      }, 0);
      averageProcessingTime = Math.round(totalMs / completedRuns.length);
    }

    const riskDistribution = {
      low: lowRiskCount,
      medium: mediumRiskCount,
      high: highRiskCount,
    };

    return Response.json({
      stats: {
        totalVendors,
        approvedCount,
        pendingCount,
        rejectedCount,
        processingCount,
        averageRiskScore,
        averageProcessingTime,
        averageProcessingTimeFormatted: `${(averageProcessingTime / 1000).toFixed(1)}s`,
        riskDistribution,
      },
      recentVendors: recentVendors.map((v) => ({
        ...v,
        documentCount: v._count.documents,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return Response.json(
      {
        error: "Failed to fetch dashboard stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
