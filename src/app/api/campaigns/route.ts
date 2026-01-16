import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/campaigns - Fetch all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const createdById = searchParams.get("createdById");

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (createdById) where.createdById = createdById;
    
    // If user is MARKETING, only show their campaigns
    if (session?.user?.role === "MARKETING") {
      where.createdById = session.user.id;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, price: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        spendRecords: {
          orderBy: { date: "desc" },
          take: 30, // Last 30 days of spend
        },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate additional metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const leadStats = await prisma.lead.aggregate({
          where: { campaignId: campaign.id },
          _count: { _all: true },
        });

        const contactedCount = await prisma.lead.count({
          where: { campaignId: campaign.id, contacted: true },
        });

        const enrolledCount = await prisma.lead.count({
          where: { campaignId: campaign.id, enrolled: true },
        });

        // Calculate total spent from spend records
        const totalSpent = campaign.spendRecords.reduce(
          (sum, record) => sum + Number(record.amount),
          0
        );

        const costPerLead = leadStats._count._all > 0
          ? totalSpent / leadStats._count._all
          : 0;

        return {
          ...campaign,
          totalSpent,
          metrics: {
            totalLeads: leadStats._count._all,
            contactedLeads: contactedCount,
            enrolledLeads: enrolledCount,
            costPerLead: costPerLead.toFixed(2),
            conversionRate: leadStats._count._all > 0
              ? ((enrolledCount / leadStats._count._all) * 100).toFixed(1)
              : "0",
          },
        };
      })
    );

    return NextResponse.json(campaignsWithMetrics);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// POST /api/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    // Use session user ID if available, otherwise allow createdById from body (for admin/API operations)
    const creatorId = session?.user?.id || body.createdById;
    
    if (!creatorId) {
      return NextResponse.json({ error: "Unauthorized - createdById required" }, { status: 401 });
    }

    // Validate platform
    const validPlatforms = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "GOOGLE_ADS", "TIKTOK"];
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name,
        platform: body.platform,
        courseId: body.courseId,
        createdById: creatorId, // The marketer who creates owns the campaign
        budget: body.budget || 0,
        status: body.status || "ACTIVE",
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
      include: {
        course: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
