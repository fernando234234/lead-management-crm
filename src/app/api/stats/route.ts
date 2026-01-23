import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const sourceParam = searchParams.get("source"); // Filter by lead source: LEGACY_IMPORT, MANUAL, CAMPAIGN

    // Build base filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseFilter: Record<string, any> = {};
    
    // Date filter
    if (startDateParam || endDateParam) {
      baseFilter.createdAt = {};
      if (startDateParam) {
        const startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        baseFilter.createdAt.gte = startDate;
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        baseFilter.createdAt.lte = endDate;
      }
    }
    
    // Source filter (supports comma-separated values like "MANUAL,CAMPAIGN")
    if (sourceParam) {
      const sources = sourceParam.split(",").map(s => s.trim());
      if (sources.length === 1) {
        baseFilter.source = sources[0];
      } else {
        baseFilter.source = { in: sources };
      }
    }
    
    // Use baseFilter instead of dateFilter throughout
    const dateFilter = baseFilter;
    // Get counts (with optional date filter for leads)
    const [
      totalLeads,
      contactedLeads,
      enrolledLeads,
      totalCourses,
      activeCourses,
      totalCampaigns,
      activeCampaigns,
      totalUsers,
      commercialUsers,
    ] = await Promise.all([
      prisma.lead.count({ where: dateFilter }),
      prisma.lead.count({ where: { ...dateFilter, contacted: true } }),
      prisma.lead.count({ where: { ...dateFilter, enrolled: true } }),
      prisma.course.count(),
      prisma.course.count({ where: { active: true } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "COMMERCIAL" } }),
    ]);

    // Get leads by status (with date filter)
    const leadsByStatus = await prisma.lead.groupBy({
      by: ["status"],
      where: dateFilter,
      _count: { status: true },
    });

    // Get total campaign spend from CampaignSpend records (supports date filtering)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spendFilter: Record<string, any> = {};
    if (startDateParam || endDateParam) {
      // Filter spend records where the spend period overlaps with the requested date range
      if (startDateParam) {
        const startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        // Spend endDate should be >= filter startDate (or endDate is null = ongoing)
        spendFilter.OR = [
          { endDate: { gte: startDate } },
          { endDate: null }
        ];
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        // Spend startDate should be <= filter endDate
        spendFilter.startDate = { lte: endDate };
      }
    }
    
    const campaignSpendTotal = await prisma.campaignSpend.aggregate({
      where: spendFilter,
      _sum: { amount: true },
    });

    // Get total revenue (enrolled leads * course price) with date filter
    const enrolledLeadsWithCourse = await prisma.lead.findMany({
      where: { ...dateFilter, enrolled: true },
      include: { course: { select: { price: true } } },
    });

    const totalRevenue = enrolledLeadsWithCourse.reduce(
      (sum, lead) => sum + (Number(lead.course?.price) || 0),
      0
    );

    // Get recent leads (with date filter)
    const recentLeads = await prisma.lead.findMany({
      where: dateFilter,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        course: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    // Get top performing campaigns
    const topCampaigns = await prisma.campaign.findMany({
      take: 5,
      include: {
        course: { select: { name: true } },
        spendRecords: true,
        _count: { select: { leads: true } },
      },
      orderBy: { leads: { _count: "desc" } },
    });

    // Get leads over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const leadsLast7Days = await prisma.lead.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    // Group by day
    const leadsOverTimeMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      leadsOverTimeMap.set(dateKey, 0);
    }

    leadsLast7Days.forEach(lead => {
      const dateKey = lead.createdAt.toISOString().split('T')[0];
      if (leadsOverTimeMap.has(dateKey)) {
        leadsOverTimeMap.set(dateKey, (leadsOverTimeMap.get(dateKey) || 0) + 1);
      }
    });

    const leadsOverTime = Array.from(leadsOverTimeMap.entries()).map(([date, count]) => {
      const d = new Date(date);
      const dayName = d.toLocaleDateString("it-IT", { weekday: "short" });
      return {
        giorno: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        date,
        lead: count
      };
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (enrolledLeads / totalLeads) * 100 : 0;

    // Calculate cost per lead (from CampaignSpend records)
    const totalCost = Number(campaignSpendTotal._sum.amount) || 0;
    const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;

    return NextResponse.json({
      overview: {
        totalLeads,
        contactedLeads,
        enrolledLeads,
        conversionRate: conversionRate.toFixed(1),
        totalCourses,
        activeCourses,
        totalCampaigns,
        activeCampaigns,
        totalUsers,
        commercialUsers,
      },
      financial: {
        totalRevenue,
        totalCost,
        costPerLead: costPerLead.toFixed(2),
        roi: totalCost > 0 ? (((totalRevenue - totalCost) / totalCost) * 100).toFixed(1) : 0,
      },
      leadsByStatus: leadsByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      recentLeads: recentLeads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        course: lead.course?.name,
        assignedTo: lead.assignedTo?.name,
        status: lead.status,
        createdAt: lead.createdAt,
      })),
      topCampaigns: topCampaigns.map((campaign) => {
        const totalSpent = campaign.spendRecords.reduce(
          (sum, record) => sum + Number(record.amount),
          0
        );
        return {
          id: campaign.id,
          name: campaign.name,
          course: campaign.course?.name,
          leads: campaign._count.leads,
          budget: totalSpent, // Now from spendRecords
        };
      }),
      leadsOverTime,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ 
      error: "Failed to fetch stats", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
