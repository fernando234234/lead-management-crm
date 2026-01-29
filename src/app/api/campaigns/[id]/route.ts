import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET /api/campaigns/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { id: true, name: true, price: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        spendRecords: {
          orderBy: { startDate: "desc" },
        },
        leads: {
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Calculate total spent from spend records
    const totalSpent = campaign.spendRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0
    );

    // Calculate cost per lead
    const leadCount = campaign.leads.length;
    const costPerLead = leadCount > 0 ? totalSpent / leadCount : 0;

    return NextResponse.json({
      ...campaign,
      totalSpent,
      costPerLead,
      leadCount,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Check if the campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { createdById: true },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Permission check: session user must be admin or creator, OR allow if no session (API testing)
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole !== "ADMIN" && existingCampaign.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to edit this campaign" },
          { status: 403 }
        );
      }
    }

    const updateData: Prisma.CampaignUpdateInput = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.platform !== undefined) updateData.platform = body.platform;
    if (body.courseId !== undefined) {
      updateData.course = { connect: { id: body.courseId } };
    }
    if (body.status !== undefined) updateData.status = body.status;
    
    // NOTE: startDate/endDate removed - campaigns are now "evergreen containers"
    // Date-based spend tracking uses CampaignSpend records

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        spendRecords: {
          orderBy: { startDate: "desc" },
        },
        leads: true,
      },
    });

    // NOTE: Budget auto-creation logic removed - spend records are now managed
    // exclusively through the "Gestione Spese" tab. Campaigns no longer have dates.

    // Refetch with updated spend records
    const updatedCampaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        course: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        spendRecords: {
          orderBy: { startDate: "desc" },
        },
        leads: true,
      },
    });

    // Calculate total spent from spend records
    const totalSpent = updatedCampaign?.spendRecords.reduce(
      (sum, record) => sum + Number(record.amount),
      0
    ) || 0;

    return NextResponse.json({
      ...updatedCampaign,
      totalSpent,
      leadCount: updatedCampaign?.leads.length || 0,
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if campaign exists and get ownership info
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      select: { 
        createdById: true,
        _count: { select: { leads: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Permission check: session user must be admin or creator, OR allow if no session (API testing)
    if (session?.user) {
      const userRole = session.user.role;
      if (userRole !== "ADMIN" && campaign.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "You don't have permission to delete this campaign" },
          { status: 403 }
        );
      }
    }

    // Check if campaign has leads
    if (campaign._count.leads > 0) {
      return NextResponse.json(
        { error: `Impossibile eliminare: la campagna ha ${campaign._count.leads} lead associati` },
        { status: 400 }
      );
    }

    // Delete the campaign (spendRecords will be cascade deleted)
    await prisma.campaign.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
