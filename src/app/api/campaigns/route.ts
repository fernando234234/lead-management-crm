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

    // Build date filter for leads (when date range is specified, filter leads by createdAt)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildLeadDateFilter = (campaignId: string): Record<string, any> => {
      const filter: Record<string, any> = { campaignId };
      if (spendStartDate || spendEndDate) {
        filter.createdAt = {};
        if (spendStartDate) {
          const start = new Date(spendStartDate);
          start.setHours(0, 0, 0, 0);
          filter.createdAt.gte = start;
        }
        if (spendEndDate) {
          const end = new Date(spendEndDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.lte = end;
        }
      }
      return filter;
    };

    // Calculate additional metrics for each campaign
    const campaignsWithMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        // When date filter is applied, count leads created in that period
        // This ensures CPL = (pro-rata spend for period) / (leads created in period)
        const leadDateFilter = buildLeadDateFilter(campaign.id);
        
        const leadStats = await prisma.lead.aggregate({
          where: leadDateFilter,
          _count: { _all: true },
        });

        const contactedCount = await prisma.lead.count({
          where: { ...leadDateFilter, contacted: true },
        });

        const enrolledCount = await prisma.lead.count({
          where: { ...leadDateFilter, enrolled: true },
        });

        // Also get total leads (all time) for reference
        const totalLeadsAllTime = await prisma.lead.count({
          where: { campaignId: campaign.id },
        });

        // Calculate total revenue from enrolled leads in period
        // Revenue is recognized by enrolledAt date (when sale happened), not createdAt
        // Priority: use lead.revenue if set, otherwise fall back to course.price
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const revenueFilter: Record<string, any> = { 
          campaignId: campaign.id, 
          enrolled: true 
        };
        if (spendStartDate || spendEndDate) {
          revenueFilter.enrolledAt = {};
          if (spendStartDate) {
            const start = new Date(spendStartDate);
            start.setHours(0, 0, 0, 0);
            revenueFilter.enrolledAt.gte = start;
          }
          if (spendEndDate) {
            const end = new Date(spendEndDate);
            end.setHours(23, 59, 59, 999);
            revenueFilter.enrolledAt.lte = end;
          }
        }
        const enrolledLeads = await prisma.lead.findMany({
          where: revenueFilter,
          select: { revenue: true, enrolledAt: true },
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

        // CPL = pro-rata spend / leads in same period (properly aligned!)
        const leadsInPeriod = leadStats._count._all;
        const costPerLead = leadsInPeriod > 0
          ? totalSpent / leadsInPeriod
          : 0;

        return {
          ...campaign,
          totalSpent,
          leadCount: leadsInPeriod, // Override with date-filtered count
          metrics: {
            totalLeads: leadsInPeriod,
            totalLeadsAllTime, // Include all-time count for reference
            contactedLeads: contactedCount,
            enrolledLeads: enrolledCount,
            totalRevenue,
            costPerLead: costPerLead.toFixed(2),
            conversionRate: leadsInPeriod > 0
              ? ((enrolledCount / leadsInPeriod) * 100).toFixed(1)
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
