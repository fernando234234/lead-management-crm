import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List empty master campaigns
// DELETE - Remove empty master campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find empty master campaigns (no campaigns linked)
    const emptyMasterCampaigns = await prisma.masterCampaign.findMany({
      where: {
        campaigns: {
          none: {},
        },
      },
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { campaigns: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      status: "analysis",
      message: `Found ${emptyMasterCampaigns.length} empty master campaigns. Use DELETE to remove them.`,
      emptyMasterCampaigns: emptyMasterCampaigns.map(mc => ({
        id: mc.id,
        name: mc.name,
        courseName: mc.course?.name || "No course linked",
        campaignCount: mc._count.campaigns,
        createdAt: mc.createdAt,
      })),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find empty master campaigns
    const emptyMasterCampaigns = await prisma.masterCampaign.findMany({
      where: {
        campaigns: {
          none: {},
        },
      },
      select: { id: true, name: true },
    });

    if (emptyMasterCampaigns.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "No empty master campaigns to delete",
        deletedCount: 0,
      });
    }

    // Delete all empty master campaigns
    const deleteResult = await prisma.masterCampaign.deleteMany({
      where: {
        id: {
          in: emptyMasterCampaigns.map(mc => mc.id),
        },
      },
    });

    return NextResponse.json({
      status: "complete",
      message: `Successfully deleted ${deleteResult.count} empty master campaigns`,
      deletedCount: deleteResult.count,
      deleted: emptyMasterCampaigns.map(mc => ({
        id: mc.id,
        name: mc.name,
      })),
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
