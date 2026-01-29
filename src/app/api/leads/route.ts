import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification, createNotificationForRole } from "@/lib/notifications";

// Rate-limited auto-cleanup: Mark stale leads as PERSO
// Only runs once per minute to avoid unnecessary DB writes on every request
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCleanupTime = 0;

async function autoCleanupStaleLeads() {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  // Mark as PERSO: leads with lastAttemptAt > 15 days ago that are still being worked
  // (not already PERSO, ISCRITTO, or enrolled)
  await prisma.lead.updateMany({
    where: {
      lastAttemptAt: { lt: fifteenDaysAgo },
      status: { in: ['NUOVO', 'CONTATTATO', 'IN_TRATTATIVA'] },
      enrolled: false,
    },
    data: {
      status: 'PERSO',
    }
  });
  
  // Also mark leads contacted > 20 days ago without recent activity
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
  
  await prisma.lead.updateMany({
    where: {
      status: 'CONTATTATO',
      contacted: true,
      contactedAt: { lt: twentyDaysAgo },
      enrolled: false,
      // Only if no call tracking started (legacy leads)
      lastAttemptAt: null,
    },
    data: {
      status: 'PERSO',
    }
  });
}

// Rate-limited wrapper - only runs cleanup if interval has passed
async function maybeCleanupStaleLeads() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) {
    return; // Skip cleanup, ran recently
  }
  lastCleanupTime = now;
  
  // Run cleanup in background (don't await to avoid blocking the response)
  autoCleanupStaleLeads().catch(err => {
    console.error("Auto-cleanup failed:", err);
  });
}

// GET /api/leads - Fetch leads with visibility rules based on user role
// - ADMIN: sees all leads
// - MARKETING: sees leads from campaigns they created
// - COMMERCIAL: sees leads they created OR are assigned to
export async function GET(request: NextRequest) {
  try {
    // Auto-cleanup stale leads (rate-limited to once per minute, non-blocking)
    maybeCleanupStaleLeads();
    
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
    const startDate = searchParams.get("startDate"); // Filter by createdAt >= startDate
    const endDate = searchParams.get("endDate"); // Filter by createdAt <= endDate

    const where: Record<string, unknown> = {};

    if (courseId) where.courseId = courseId;
    if (campaignId) where.campaignId = campaignId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
    if (contacted !== null && contacted !== "") where.contacted = contacted === "true";
    if (enrolled !== null && enrolled !== "") where.enrolled = enrolled === "true";
    
    // Date range filter on createdAt
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        (where.createdAt as Record<string, Date>).gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, Date>).lte = end;
      }
    }
    
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
        campaign: { 
          select: { 
            id: true, 
            name: true, 
            platform: true, 
            createdById: true,
            masterCampaign: { select: { id: true, name: true } }
          } 
        },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Il nome del lead è obbligatorio" }, { status: 400 });
    }
    if (!body.courseId) {
      return NextResponse.json({ error: "Il corso è obbligatorio" }, { status: 400 });
    }
    if (!body.campaignId) {
      return NextResponse.json({ error: "La campagna è obbligatoria. Seleziona una campagna esistente o creane una nuova." }, { status: 400 });
    }

    // Verify campaign exists and belongs to the course
    const campaign = await prisma.campaign.findUnique({
      where: { id: body.campaignId },
      select: { id: true, courseId: true, createdById: true, name: true },
    });
    
    if (!campaign) {
      return NextResponse.json({ error: "Campagna non trovata" }, { status: 400 });
    }
    
    if (campaign.courseId !== body.courseId) {
      return NextResponse.json({ error: "La campagna selezionata non appartiene al corso selezionato" }, { status: 400 });
    }

    const campaignId = body.campaignId;
    const campaignOwnerId = campaign.createdById;

    // Check for Duplicate (Homonym + Same Course)
    const existingLead = await prisma.lead.findFirst({
      where: {
        name: { equals: body.name, mode: "insensitive" },
        courseId: body.courseId
      }
    });

    const lead = await prisma.lead.create({
      data: {
        name: body.name.trim(),
        email: body.email || null,
        phone: body.phone || null,
        courseId: body.courseId,
        campaignId: campaignId, // Required - validated above
        assignedToId: body.assignedToId || null,
        createdById: body.createdById || null,
        notes: body.notes || null,
        source: body.source || "MANUAL",
        acquisitionCost: body.acquisitionCost ?? null,
        // Binary fields (default false)
        contacted: body.contacted ?? false,
        isTarget: body.isTarget ?? false,
        enrolled: body.enrolled ?? false,
        status: body.status || "NUOVO",
      },
      include: {
        course: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // 3. Duplicate Alert for Admin (Condition 10)
    if (existingLead) {
      await createNotificationForRole(
        "ADMIN",
        "SYSTEM",
        "Possibile Duplicato Lead",
        `Attenzione: Il lead "${body.name}" è stato creato ma esiste già un lead con lo stesso nome per questo corso.`,
        `/admin/leads/${lead.id}`
      );
    }

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
