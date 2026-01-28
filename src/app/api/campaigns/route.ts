import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateTotalProRataSpend, parseDateParam } from "@/lib/spendProRata";

// GET /api/campaigns - Fetch all campaigns with optional date-filtered spend
// OPTIMIZED: Uses batch queries instead of N+1 pattern (was 5N queries, now ~5 total)
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

    // 1. Fetch campaigns with related data
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

    // If no campaigns, return early
    if (campaigns.length === 0) {
      return NextResponse.json([]);
    }

    const campaignIds = campaigns.map(c => c.id);

    // Build date filter for leads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildLeadDateFilter = (): Record<string, any> => {
      const filter: Record<string, any> = {};
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildEnrolledDateFilter = (): Record<string, any> => {
      const filter: Record<string, any> = {};
      if (spendStartDate || spendEndDate) {
        filter.enrolledAt = {};
        if (spendStartDate) {
          const start = new Date(spendStartDate);
          start.setHours(0, 0, 0, 0);
          filter.enrolledAt.gte = start;
        }
        if (spendEndDate) {
          const end = new Date(spendEndDate);
          end.setHours(23, 59, 59, 999);
          filter.enrolledAt.lte = end;
        }
      }
      return filter;
    };

    const leadDateFilter = buildLeadDateFilter();
    const enrolledDateFilter = buildEnrolledDateFilter();

    // 2. BATCH QUERIES - Fetch all lead metrics in parallel (instead of N+1)
    const [
      // Total leads per campaign (with date filter)
      leadsCountByPeriod,
      // Contacted leads per campaign (with date filter)
      contactedCountByCampaign,
      // Enrolled leads per campaign (with date filter)
      enrolledCountByCampaign,
      // All-time leads per campaign
      allTimeLeadsByCampaign,
      // Enrolled leads with revenue (for revenue calculation)
      enrolledLeadsWithRevenue,
    ] = await Promise.all([
      // Query 1: Total leads in period by campaign
      prisma.lead.groupBy({
        by: ['campaignId'],
        where: {
          campaignId: { in: campaignIds },
          ...leadDateFilter,
        },
        _count: { _all: true },
      }),
      // Query 2: Contacted leads in period by campaign
      prisma.lead.groupBy({
        by: ['campaignId'],
        where: {
          campaignId: { in: campaignIds },
          contacted: true,
          ...leadDateFilter,
        },
        _count: { _all: true },
      }),
      // Query 3: Enrolled leads in period by campaign
      prisma.lead.groupBy({
        by: ['campaignId'],
        where: {
          campaignId: { in: campaignIds },
          enrolled: true,
          ...leadDateFilter,
        },
        _count: { _all: true },
      }),
      // Query 4: All-time leads by campaign (no date filter)
      prisma.lead.groupBy({
        by: ['campaignId'],
        where: {
          campaignId: { in: campaignIds },
        },
        _count: { _all: true },
      }),
      // Query 5: Enrolled leads with revenue for revenue calculation
      prisma.lead.findMany({
        where: {
          campaignId: { in: campaignIds },
          enrolled: true,
          ...enrolledDateFilter,
        },
        select: {
          campaignId: true,
          revenue: true,
        },
      }),
    ]);

    // 3. Build lookup maps for O(1) access
    const leadsInPeriodMap = new Map(
      leadsCountByPeriod.map(r => [r.campaignId, r._count._all])
    );
    const contactedMap = new Map(
      contactedCountByCampaign.map(r => [r.campaignId, r._count._all])
    );
    const enrolledMap = new Map(
      enrolledCountByCampaign.map(r => [r.campaignId, r._count._all])
    );
    const allTimeLeadsMap = new Map(
      allTimeLeadsByCampaign.map(r => [r.campaignId, r._count._all])
    );

    // Group enrolled leads by campaign for revenue calculation
    const enrolledLeadsByCampaign = new Map<string, typeof enrolledLeadsWithRevenue>();
    for (const lead of enrolledLeadsWithRevenue) {
      if (!lead.campaignId) continue;
      if (!enrolledLeadsByCampaign.has(lead.campaignId)) {
        enrolledLeadsByCampaign.set(lead.campaignId, []);
      }
      enrolledLeadsByCampaign.get(lead.campaignId)!.push(lead);
    }

    // 4. Build final response with metrics (no additional DB calls!)
    const filterRange = {
      start: parseDateParam(spendStartDate),
      end: parseDateParam(spendEndDate, true),
    };

    const campaignsWithMetrics = campaigns.map((campaign) => {
      const leadsInPeriod = leadsInPeriodMap.get(campaign.id) || 0;
      const contactedCount = contactedMap.get(campaign.id) || 0;
      const enrolledCount = enrolledMap.get(campaign.id) || 0;
      const totalLeadsAllTime = allTimeLeadsMap.get(campaign.id) || 0;

      // Calculate revenue from enrolled leads
      const coursePrice = Number(campaign.course?.price) || 0;
      const campaignEnrolledLeads = enrolledLeadsByCampaign.get(campaign.id) || [];
      const totalRevenue = campaignEnrolledLeads.reduce((sum, lead) => {
        const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
        return sum + (leadRevenue > 0 ? leadRevenue : coursePrice);
      }, 0);

      // Calculate total spent from spend records with PRO-RATA calculation
      const spendRecordsForCalc = campaign.spendRecords.map(r => ({
        startDate: r.startDate,
        endDate: r.endDate,
        amount: Number(r.amount),
      }));
      const totalSpent = calculateTotalProRataSpend(spendRecordsForCalc, filterRange);

      // CPL = pro-rata spend / leads in same period
      const costPerLead = leadsInPeriod > 0 ? totalSpent / leadsInPeriod : 0;

      return {
        ...campaign,
        totalSpent,
        leadCount: leadsInPeriod,
        metrics: {
          totalLeads: leadsInPeriod,
          totalLeadsAllTime,
          contactedLeads: contactedCount,
          enrolledLeads: enrolledCount,
          totalRevenue,
          costPerLead: costPerLead.toFixed(2),
          conversionRate: leadsInPeriod > 0
            ? ((enrolledCount / leadsInPeriod) * 100).toFixed(1)
            : "0",
        },
      };
    });

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
