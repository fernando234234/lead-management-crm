import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface Activity {
  id: string;
  type: "CALL" | "STATUS_CHANGE" | "ENROLLMENT" | "LEAD_CREATED" | "CONTACT" | "NOTE" | "EMAIL" | "ASSIGNMENT";
  description: string;
  leadId: string;
  leadName: string;
  userId: string;
  createdAt: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    callOutcome?: string;
    courseName?: string;
    outcomeNotes?: string;
  };
}

// GET /api/activities - Get recent activities for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || session.user.id;
    const limit = parseInt(searchParams.get("limit") || "10");
    const days = parseInt(searchParams.get("days") || "7");

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // First, try to fetch from LeadActivity table (new system)
    const leadActivities = await prisma.leadActivity.findMany({
      where: {
        userId: userId,
        createdAt: { gte: startDate },
      },
      include: {
        lead: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // If we have activities from the new system, use those
    if (leadActivities.length > 0) {
      const activities: Activity[] = leadActivities.map((activity) => ({
        id: activity.id,
        type: activity.type as Activity["type"],
        description: activity.description,
        leadId: activity.leadId,
        leadName: activity.lead.name,
        userId: activity.userId,
        createdAt: activity.createdAt.toISOString(),
        metadata: activity.metadata as Activity["metadata"],
      }));

      return NextResponse.json(activities);
    }

    // Fallback: Derive activities from lead data (for backwards compatibility)
    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: userId,
        OR: [
          { contactedAt: { gte: startDate } },
          { enrolledAt: { gte: startDate } },
          { createdAt: { gte: startDate } },
          { updatedAt: { gte: startDate } },
        ],
      },
      include: {
        course: { select: { name: true } },
        campaign: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit * 3,
    });

    const activities: Activity[] = [];

    for (const lead of leads) {
      // Check for enrollment
      if (lead.enrolledAt && new Date(lead.enrolledAt) >= startDate) {
        activities.push({
          id: `enrollment-${lead.id}`,
          type: "ENROLLMENT",
          description: `${lead.name} iscritto al corso ${lead.course?.name || ""}`,
          leadId: lead.id,
          leadName: lead.name,
          userId: userId,
          createdAt: lead.enrolledAt.toISOString(),
          metadata: { courseName: lead.course?.name },
        });
      }

      // Check for contact with call outcome
      if (lead.contactedAt && new Date(lead.contactedAt) >= startDate) {
        const outcomeLabels: Record<string, string> = {
          POSITIVO: "esito positivo",
          NEGATIVO: "esito negativo",
          RICHIAMARE: "da richiamare",
          NON_RISPONDE: "non risponde",
        };
        
        const outcomeText = lead.callOutcome 
          ? ` - ${outcomeLabels[lead.callOutcome] || lead.callOutcome}`
          : "";

        activities.push({
          id: `contact-${lead.id}-${lead.contactedAt.getTime()}`,
          type: "CALL",
          description: `Chiamato ${lead.name}${outcomeText}`,
          leadId: lead.id,
          leadName: lead.name,
          userId: userId,
          createdAt: lead.contactedAt.toISOString(),
          metadata: { callOutcome: lead.callOutcome || undefined },
        });
      }

      // Check for lead creation
      if (lead.createdById === userId && new Date(lead.createdAt) >= startDate) {
        activities.push({
          id: `created-${lead.id}`,
          type: "LEAD_CREATED",
          description: `Creato lead ${lead.name}`,
          leadId: lead.id,
          leadName: lead.name,
          userId: userId,
          createdAt: lead.createdAt.toISOString(),
          metadata: { courseName: lead.course?.name },
        });
      }

      // Check for status change
      if (
        lead.status !== "NUOVO" &&
        lead.updatedAt.getTime() !== lead.createdAt.getTime() &&
        new Date(lead.updatedAt) >= startDate &&
        !lead.enrolledAt
      ) {
        const statusLabels: Record<string, string> = {
          CONTATTATO: "Contattato",
          IN_TRATTATIVA: "In Trattativa",
          ISCRITTO: "Iscritto",
          PERSO: "Perso",
        };

        const hasContact = lead.contactedAt && 
          Math.abs(lead.contactedAt.getTime() - lead.updatedAt.getTime()) < 60000;
        
        if (!hasContact) {
          activities.push({
            id: `status-${lead.id}-${lead.updatedAt.getTime()}`,
            type: "STATUS_CHANGE",
            description: `${lead.name} spostato a ${statusLabels[lead.status] || lead.status}`,
            leadId: lead.id,
            leadName: lead.name,
            userId: userId,
            createdAt: lead.updatedAt.toISOString(),
            metadata: { newStatus: lead.status },
          });
        }
      }
    }

    // Sort and limit
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(activities.slice(0, limit));
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle attività" },
      { status: 500 }
    );
  }
}
