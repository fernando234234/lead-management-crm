import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// GET /api/leads - Fetch leads with visibility rules based on user role
// - ADMIN: sees all leads
// - MARKETING: sees leads from campaigns they created
// - COMMERCIAL: sees leads they created OR are assigned to
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    // Filters
    const courseId = searchParams.get("courseId");
    const campaignId = searchParams.get("campaignId");
    const assignedToId = searchParams.get("assignedToId");
    const status = searchParams.get("status");
    const contacted = searchParams.get("contacted");
    const enrolled = searchParams.get("enrolled");
    const search = searchParams.get("search");
    const source = searchParams.get("source"); // Filter by lead source: LEGACY_IMPORT, MANUAL, CAMPAIGN

    const where: Record<string, unknown> = {};

    if (courseId) where.courseId = courseId;
    if (campaignId) where.campaignId = campaignId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (contacted !== null && contacted !== "") where.contacted = contacted === "true";
    if (enrolled !== null && enrolled !== "") where.enrolled = enrolled === "true";
    
    // Handle source filter (supports comma-separated values like "MANUAL,CAMPAIGN")
    if (source) {
      const sources = source.split(",").map(s => s.trim());
      if (sources.length === 1) {
        where.source = sources[0];
      } else {
        where.source = { in: sources };
      }
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Apply visibility rules based on user role
    if (session?.user) {
      const userId = session.user.id;
      const userRole = session.user.role;

      if (userRole === "MARKETING") {
        // Marketing sees leads from campaigns they created
        // First get all campaign IDs created by this marketer
        const myCampaigns = await prisma.campaign.findMany({
          where: { createdById: userId },
          select: { id: true },
        });
        const myCampaignIds = myCampaigns.map(c => c.id);
        
        where.campaignId = { in: myCampaignIds };
      } else if (userRole === "COMMERCIAL") {
        // Commercial sees leads they created OR are assigned to
        where.OR = [
          { createdById: userId },
          { assignedToId: userId },
          // Also include search OR conditions if present
          ...(search ? [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ] : []),
        ];
        // Remove the search OR since we merged it above
        if (search) {
          delete where.OR;
          where.AND = [
            {
              OR: [
                { createdById: userId },
                { assignedToId: userId },
              ],
            },
            {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            },
          ];
        } else {
          where.OR = [
            { createdById: userId },
            { assignedToId: userId },
          ];
        }
      }
      // ADMIN sees all leads - no additional filtering needed
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, price: true } },
        campaign: { select: { id: true, name: true, platform: true, createdById: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        contactedBy: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If campaignId is provided, fetch campaign to get the marketer who owns it
    let campaignOwnerId: string | null = null;
    if (body.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: body.campaignId },
        select: { createdById: true, name: true },
      });
      campaignOwnerId = campaign?.createdById || null;
    }

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        courseId: body.courseId,
        campaignId: body.campaignId || null,
        assignedToId: body.assignedToId || null,
        createdById: body.createdById || null,
        isTarget: body.isTarget ?? false,
        notes: body.notes || null,
        status: body.status || "NUOVO",
        source: body.source || "MANUAL",
        acquisitionCost: body.acquisitionCost ?? null,
      },
      include: {
        course: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Notifica il commerciale quando gli viene assegnato un lead
    if (body.assignedToId) {
      await createNotification(
        body.assignedToId,
        "LEAD_ASSIGNED",
        "Nuovo lead assegnato",
        `Ti è stato assegnato un nuovo lead: ${body.name}`,
        `/commercial/leads/${lead.id}`
      );
    }

    // Notifica il marketer quando un lead viene aggiunto alla sua campagna
    // (solo se il marketer non è anche chi ha creato il lead)
    if (campaignOwnerId && campaignOwnerId !== body.createdById) {
      await createNotification(
        campaignOwnerId,
        "LEAD_CREATED",
        "Nuovo lead nella tua campagna",
        `È stato aggiunto un nuovo lead "${body.name}" alla campagna "${lead.campaign?.name}"`,
        `/marketing/leads`
      );
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
