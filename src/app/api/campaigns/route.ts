import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateTotalProRataSpend, parseDateParam } from "@/lib/spendProRata";

// GET /api/campaigns - Fetch all campaigns with optional date-filtered spend
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const createdById = searchParams.get("createdById");
    
    // Date filtering for spend calculations
    const spendStartDate = searchParams.get("spendStartDate");
    const spendEndDate = searchParams.get("spendEndDate");

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (createdById) where.createdById = createdById;
    
    // If user is MARKETING, only show their campaigns
    if (session?.user?.role === "MARKETING") {
      where.createdById = session.user.id;
    }

    // Build spend records filter for date overlap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let spendRecordsWhere: any = undefined;
    if (spendStartDate || spendEndDate) {
      const conditions = [];
      
      if (spendStartDate) {
        const start = new Date(spendStartDate);
        start.setHours(0, 0, 0, 0);
        // Record's endDate is null (ongoing) OR endDate >= filter start
        conditions.push({
          OR: [
            { endDate: null },
            { endDate: { gte: start } },
          ],
        });
      }
      
      if (spendEndDate) {
        const end = new Date(spendEndDate);
        end.setHours(23, 59, 59, 999);
        // Record's startDate <= filter end
        conditions.push({ startDate: { lte: end } });
      }
      
      if (conditions.length > 0) {
        spendRecordsWhere = { AND: conditions };
      }
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, price: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        spendRecords: {
          where: spendRecordsWhere,
          orderBy: { startDate: "desc" },
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

        // Calculate total revenue from enrolled leads
        // Priority: use lead.revenue if set, otherwise fall back to course.price
        const enrolledLeads = await prisma.lead.findMany({
          where: { campaignId: campaign.id, enrolled: true },
          select: { revenue: true },
        });
        
        const coursePrice = Number(campaign.course?.price) || 0;
        const totalRevenue = enrolledLeads.reduce((sum, lead) => {
          const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
          return sum + (leadRevenue > 0 ? leadRevenue : coursePrice);
        }, 0);

        // Calculate total spent from spend records with PRO-RATA calculation
        // When date filters are applied, spend is attributed proportionally to the overlap
        const filterRange = {
          start: parseDateParam(spendStartDate),
          end: parseDateParam(spendEndDate, true),
        };
        const spendRecordsForCalc = campaign.spendRecords.map(r => ({
          startDate: r.startDate,
          endDate: r.endDate,
          amount: Number(r.amount),
        }));
        const totalSpent = calculateTotalProRataSpend(spendRecordsForCalc, filterRange);

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
            totalRevenue, // New field: actual revenue from leads
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
    const validPlatforms = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // 1. Find or Create MasterCampaign (Parent)
    // Group campaigns by Name + Course
    let masterCampaign = await prisma.masterCampaign.findFirst({
      where: {
        name: body.name,
        courseId: body.courseId
      },
      include: { course: true }
    });

    if (!masterCampaign) {
      masterCampaign = await prisma.masterCampaign.create({
        data: {
          name: body.name,
          courseId: body.courseId,
          status: "ACTIVE"
        },
        include: { course: true }
      });
    }

    // 2. Create Campaign Variant (Child)
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const budgetAmount = parseFloat(body.budget) || 0;

    const campaign = await prisma.campaign.create({
      data: {
        name: `${body.name} - ${body.platform}`, // Descriptive name for the variant
        masterCampaignId: masterCampaign.id,
        platform: body.platform,
        courseId: body.courseId, // Legacy field, we can keep it populated for easier migration/queries
        createdById: creatorId,
        budget: 0, // No longer used directly - spend goes to CampaignSpend
        status: body.status || "ACTIVE",
        startDate,
        endDate,
        // Spend records are added manually via the "Gestione Spese" tab
      },
      include: {
        masterCampaign: { include: { course: true } },
        createdBy: { select: { id: true, name: true } },
        spendRecords: true,
      },
    });

    // Return the campaign in a format compatible with the UI
    const responseCampaign = {
        ...campaign,
        name: masterCampaign.name, // Return master name for display consistency in lists? Or variant? 
        // Actually, UI expects 'name' to be the one entered. 
        // If I return variant name "Summer - META", it might be confusing if they just entered "Summer".
        // But for tracking, variant name is better.
        // Let's return the variant, but maybe UI needs adjustment.
        // For now, let's return the campaign object as is.
        course: masterCampaign.course // Polyfill the course relation from master
    };

    return NextResponse.json(responseCampaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
