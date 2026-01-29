import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/master-campaigns/[id]/platforms - Add a platform variant to a master campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate platform
    const validPlatforms = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];
    if (!validPlatforms.includes(body.platform)) {
      return NextResponse.json({ error: "Piattaforma non valida" }, { status: 400 });
    }

    // Get the master campaign
    const masterCampaign = await prisma.masterCampaign.findUnique({
      where: { id },
      include: { campaigns: true },
    });

    if (!masterCampaign) {
      return NextResponse.json({ error: "Campagna non trovata" }, { status: 404 });
    }

    // Check if this platform already exists for this master campaign
    const existingPlatform = masterCampaign.campaigns.find(
      (c) => c.platform === body.platform
    );

    if (existingPlatform) {
      return NextResponse.json(
        { error: `La piattaforma ${body.platform} esiste già per questa campagna` },
        { status: 400 }
      );
    }

    // Create the platform variant (Campaign)
    const campaign = await prisma.campaign.create({
      data: {
        name: `${masterCampaign.name} - ${body.platform}`,
        masterCampaignId: id,
        platform: body.platform,
        courseId: masterCampaign.courseId,
        createdById: session.user.id,
        status: body.status || "ACTIVE",
      },
      include: {
        spendRecords: true,
        _count: { select: { leads: true } },
      },
    });

    return NextResponse.json({
      id: campaign.id,
      platform: campaign.platform,
      status: campaign.status,
      createdAt: campaign.createdAt,
      leadCount: 0,
      totalSpent: 0,
      spendRecords: [],
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding platform to master campaign:", error);
    return NextResponse.json({ error: "Failed to add platform" }, { status: 500 });
  }
}

// DELETE /api/master-campaigns/[id]/platforms?platform=META - Remove a platform variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo gli admin possono eliminare piattaforme" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform) {
      return NextResponse.json({ error: "Platform parameter required" }, { status: 400 });
    }

    // Find the campaign (platform variant)
    const campaign = await prisma.campaign.findFirst({
      where: {
        masterCampaignId: id,
        platform: platform as "META" | "GOOGLE_ADS" | "LINKEDIN" | "TIKTOK",
      },
      include: { _count: { select: { leads: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Platform variant not found" }, { status: 404 });
    }

    // Check if there are leads attached
    if (campaign._count.leads > 0) {
      return NextResponse.json(
        { error: `Non puoi eliminare questa piattaforma: ci sono ${campaign._count.leads} lead collegati` },
        { status: 400 }
      );
    }

    // Delete the campaign (cascade will delete spend records)
    await prisma.campaign.delete({
      where: { id: campaign.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting platform variant:", error);
    return NextResponse.json({ error: "Failed to delete platform" }, { status: 500 });
  }
}
