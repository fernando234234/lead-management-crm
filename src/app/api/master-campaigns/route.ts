import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateProRataSpend, parseDateParam, DateRange } from "@/lib/spendProRata";
import { toNumber } from "@/lib/decimal";

// GET /api/master-campaigns - Fetch all master campaigns (folders) with their platform variants
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    
    // Date filter params for pro-rata calculation
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const filterRange: DateRange = {
      start: parseDateParam(startDateParam, false),
      end: parseDateParam(endDateParam, true),
    };

    const where: Record<string, unknown> = {};
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;

    // Fetch MasterCampaigns with their Campaign variants (platforms)
    const masterCampaigns = await prisma.masterCampaign.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, price: true } },
        campaigns: {
          include: {
            spendRecords: { orderBy: { startDate: "desc" } },
            _count: { select: { leads: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { platform: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate aggregated metrics for each master campaign
    const masterCampaignsWithMetrics = masterCampaigns.map((master) => {
      // Aggregate across all platform variants
      const totalLeads = master.campaigns.reduce((sum, c) => sum + (c._count?.leads || 0), 0);
      
      // Calculate total spent with pro-rata when date filter is applied
      const totalSpent = master.campaigns.reduce((sum, c) => {
        const campaignSpend = c.spendRecords.reduce((s, r) => {
          // Apply pro-rata calculation for date-filtered queries
          return s + calculateProRataSpend(
            {
              startDate: r.startDate,
              endDate: r.endDate,
              amount: toNumber(r.amount),
            },
            filterRange
          );
        }, 0);
        return sum + campaignSpend;
      }, 0);
      
      // Also calculate raw total (without pro-rata) for reference
      const totalSpentRaw = master.campaigns.reduce((sum, c) => {
        return sum + c.spendRecords.reduce((s, r) => s + toNumber(r.amount), 0);
      }, 0);
      
      // Get list of platforms in this master campaign
      const platforms = master.campaigns.map(c => c.platform);
      
      return {
        id: master.id,
        name: master.name,
        courseId: master.courseId,
        course: master.course,
        status: master.status,
        createdAt: master.createdAt,
        updatedAt: master.updatedAt,
        // Platform variants
        platforms,
        campaigns: master.campaigns.map(c => {
          // Calculate per-campaign spend with pro-rata
          const campaignSpentProRata = c.spendRecords.reduce((s, r) => {
            return s + calculateProRataSpend(
              {
                startDate: r.startDate,
                endDate: r.endDate,
                amount: toNumber(r.amount),
              },
              filterRange
            );
          }, 0);
          
          return {
            id: c.id,
            platform: c.platform,
            status: c.status,
            createdAt: c.createdAt,
            leadCount: c._count?.leads || 0,
            totalSpent: campaignSpentProRata,
            totalSpentRaw: c.spendRecords.reduce((s, r) => s + toNumber(r.amount), 0),
            spendRecords: c.spendRecords,
            createdBy: c.createdBy,
          };
        }),
        // Aggregated metrics
        metrics: {
          totalLeads,
          totalSpent,
          totalSpentRaw, // Raw total for comparison
          platformCount: platforms.length,
          costPerLead: totalLeads > 0 ? (totalSpent / totalLeads).toFixed(2) : "0",
          // Indicate if pro-rata was applied
          proRataApplied: !!(filterRange.start || filterRange.end),
        },
      };
    });

    return NextResponse.json(masterCampaignsWithMetrics);
  } catch (error) {
    console.error("Error fetching master campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch master campaigns" }, { status: 500 });
  }
}

// POST /api/master-campaigns - Create a new master campaign (folder)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Il nome della campagna è obbligatorio" }, { status: 400 });
    }
    if (!body.courseId) {
      return NextResponse.json({ error: "Il corso è obbligatorio" }, { status: 400 });
    }

    // Check if MasterCampaign with same name+course already exists
    const existing = await prisma.masterCampaign.findFirst({
      where: {
        name: body.name.trim(),
        courseId: body.courseId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Esiste già una campagna con questo nome per questo corso" },
        { status: 400 }
      );
    }

    // Create the MasterCampaign (folder)
    const masterCampaign = await prisma.masterCampaign.create({
      data: {
        name: body.name.trim(),
        courseId: body.courseId,
        status: body.status || "ACTIVE",
      },
      include: {
        course: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(masterCampaign, { status: 201 });
  } catch (error) {
    console.error("Error creating master campaign:", error);
    return NextResponse.json({ error: "Failed to create master campaign" }, { status: 500 });
  }
}
