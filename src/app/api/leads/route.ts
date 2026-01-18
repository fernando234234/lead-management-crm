import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// GET /api/leads - Fetch all leads with filters
export async function GET(request: NextRequest) {
  try {
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
        `Ti e stato assegnato un nuovo lead: ${body.name}`,
        `/commercial/leads/${lead.id}`
      );
    }

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
