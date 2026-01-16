import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/campaigns/[id]/spend - Get all spend records for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const spendRecords = await prisma.campaignSpend.findMany({
      where: { campaignId: params.id },
      orderBy: { date: "desc" },
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

    // Validate required fields
    if (!body.date || body.amount === undefined) {
      return NextResponse.json(
        { error: "Date and amount are required" },
        { status: 400 }
      );
    }

    // Parse the date - ensure it's just the date part (no time)
    const spendDate = new Date(body.date);
    spendDate.setHours(0, 0, 0, 0);

    // Upsert - update if exists for same date, otherwise create
    const spendRecord = await prisma.campaignSpend.upsert({
      where: {
        campaignId_date: {
          campaignId: params.id,
          date: spendDate,
        },
      },
      update: {
        amount: body.amount,
        notes: body.notes || null,
      },
      create: {
        campaignId: params.id,
        date: spendDate,
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
