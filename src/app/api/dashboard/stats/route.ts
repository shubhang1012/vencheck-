import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    // Count by status
    const [totalVendors, approvedCount, pendingCount, rejectedCount, processingCount] =
      await Promise.all([
        prisma.vendor.count(),
        prisma.vendor.count({ where: { status: "APPROVED" } }),
        prisma.vendor.count({ where: { status: "PENDING" } }),
        prisma.vendor.count({ where: { status: "REJECTED" } }),
        prisma.vendor.count({ where: { status: "PROCESSING" } }),
      ]);

    // Average risk score
    const riskAgg = await prisma.vendor.aggregate({
      _avg: { riskScore: true },
    });
    const averageRiskScore = Math.round(riskAgg._avg.riskScore ?? 0);

    // Average processing time (from completed validation runs)
    const completedRuns = await prisma.validationRun.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

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

    // Recent vendors (last 10)
    const recentVendors = await prisma.vendor.findMany({
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
    });

    // Risk score distribution
    const riskDistribution = {
      low: await prisma.vendor.count({
        where: { riskScore: { lte: 20 } },
      }),
      medium: await prisma.vendor.count({
        where: { riskScore: { gt: 20, lte: 60 } },
      }),
      high: await prisma.vendor.count({
        where: { riskScore: { gt: 60 } },
      }),
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
