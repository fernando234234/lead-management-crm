import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/stats - Get dashboard statistics
export async function GET() {
  try {
    // Get counts
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
      prisma.lead.count(),
      prisma.lead.count({ where: { contacted: true } }),
      prisma.lead.count({ where: { enrolled: true } }),
      prisma.course.count(),
      prisma.course.count({ where: { active: true } }),
      prisma.campaign.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "COMMERCIAL" } }),
    ]);

    // Get leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    // Get total campaign spend from spend records
    const spendRecords = await prisma.campaignSpend.aggregate({
      _sum: { amount: true },
    });

    // Get total revenue (enrolled leads * course price)
    const enrolledLeadsWithCourse = await prisma.lead.findMany({
      where: { enrolled: true },
      include: { course: { select: { price: true } } },
    });

    const totalRevenue = enrolledLeadsWithCourse.reduce(
      (sum, lead) => sum + (Number(lead.course?.price) || 0),
      0
    );

    // Get recent leads
    const recentLeads = await prisma.lead.findMany({
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
        _count: { select: { leads: true } },
      },
      orderBy: { leads: { _count: "desc" } },
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (enrolledLeads / totalLeads) * 100 : 0;

    // Calculate cost per lead
    const totalCost = Number(spendRecords._sum.amount) || 0;
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
      topCampaigns: topCampaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        course: campaign.course?.name,
        leads: campaign._count.leads,
        budget: Number(campaign.budget),
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ 
      error: "Failed to fetch stats", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
