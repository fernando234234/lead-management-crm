import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/campaigns/[id]/spend - Get spend records for a campaign with optional date filtering
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const filterStartDate = searchParams.get("startDate");
    const filterEndDate = searchParams.get("endDate");

    // Build where clause with optional date filtering
    // Filter records whose date range overlaps with the requested range
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { campaignId: params.id };

    if (filterStartDate || filterEndDate) {
      const conditions = [];
      
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        start.setHours(0, 0, 0, 0);
        // Record's endDate is null (ongoing) OR endDate >= filter start
        conditions.push({
          OR: [
            { endDate: null },
            { endDate: { gte: start } },
          ],
        });
      }
      
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999);
        // Record's startDate <= filter end
        conditions.push({ startDate: { lte: end } });
      }
      
      if (conditions.length > 0) {
        whereClause.AND = conditions;
      }
    }

    const spendRecords = await prisma.campaignSpend.findMany({
      where: whereClause,
      orderBy: { startDate: "desc" },
    });

    // Calculate totals
    const totalSpent = spendRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0
    );

    return NextResponse.json({
      records: spendRecords,
      totalSpent,
      count: spendRecords.length,
    });
  } catch (error) {
    console.error("Error fetching spend records:", error);
    return NextResponse.json({ error: "Failed to fetch spend records" }, { status: 500 });
  }
}

// POST /api/campaigns/[id]/spend - Add a spend record
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Permission check if session exists
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole !== "ADMIN" && campaign.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to add spend to this campaign" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Validate required fields - now uses startDate (and optional endDate)
    if (!body.startDate || body.amount === undefined) {
      return NextResponse.json(
        { error: "startDate and amount are required" },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(body.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    // Upsert - update if exists for same startDate, otherwise create
    const spendRecord = await prisma.campaignSpend.upsert({
      where: {
        campaignId_startDate: {
          campaignId: params.id,
          startDate: startDate,
        },
      },
      update: {
        amount: body.amount,
        endDate: endDate,
        notes: body.notes || null,
      },
      create: {
        campaignId: params.id,
        startDate: startDate,
        endDate: endDate,
        amount: body.amount,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(spendRecord, { status: 201 });
  } catch (error) {
    console.error("Error creating spend record:", error);
    return NextResponse.json({ error: "Failed to create spend record" }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/spend - Update a spend record by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const spendId = searchParams.get("spendId");

    if (!spendId) {
      return NextResponse.json(
        { error: "spendId query parameter is required" },
        { status: 400 }
      );
    }

    // Check if the spend record exists and belongs to this campaign
    const existingRecord = await prisma.campaignSpend.findFirst({
      where: {
        id: spendId,
        campaignId: params.id,
      },
      include: {
        campaign: { select: { createdById: true } },
      },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Spend record not found" }, { status: 404 });
    }

    // Permission check if session exists
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole !== "ADMIN" && existingRecord.campaign.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to update this spend record" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (body.amount !== undefined) {
      updateData.amount = body.amount;
    }

    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      startDate.setHours(0, 0, 0, 0);
      updateData.startDate = startDate;
    }

    if (body.endDate !== undefined) {
      if (body.endDate === null) {
        updateData.endDate = null;
      } else {
        const endDate = new Date(body.endDate);
        endDate.setHours(0, 0, 0, 0);
        updateData.endDate = endDate;
      }
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    // Validate endDate >= startDate if both are being set
    const finalStartDate = updateData.startDate || existingRecord.startDate;
    const finalEndDate = updateData.endDate !== undefined ? updateData.endDate : existingRecord.endDate;
    
    if (finalEndDate && finalStartDate > finalEndDate) {
      return NextResponse.json(
        { error: "End date must be greater than or equal to start date" },
        { status: 400 }
      );
    }

    const updatedRecord = await prisma.campaignSpend.update({
      where: { id: spendId },
      data: updateData,
    });

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating spend record:", error);
    return NextResponse.json({ error: "Failed to update spend record" }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/spend - Delete a spend record by ID (passed in query string)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Get the spend record ID from query params
    const { searchParams } = new URL(request.url);
    const spendId = searchParams.get("spendId");

    if (!spendId) {
      return NextResponse.json(
        { error: "spendId query parameter is required" },
        { status: 400 }
      );
    }

    // Check if the spend record exists and belongs to this campaign
    const spendRecord = await prisma.campaignSpend.findFirst({
      where: {
        id: spendId,
        campaignId: params.id,
      },
      include: {
        campaign: { select: { createdById: true } },
      },
    });

    if (!spendRecord) {
      return NextResponse.json({ error: "Spend record not found" }, { status: 404 });
    }

    // Permission check if session exists
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole !== "ADMIN" && spendRecord.campaign.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to delete this spend record" },
          { status: 403 }
        );
      }
    }

    await prisma.campaignSpend.delete({
      where: { id: spendId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting spend record:", error);
    return NextResponse.json({ error: "Failed to delete spend record" }, { status: 500 });
  }
}
