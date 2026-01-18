import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface Activity {
  id: string;
  type: "CALL" | "STATUS_CHANGE" | "ENROLLMENT" | "LEAD_CREATED" | "CONTACT";
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

    // Fetch leads assigned to this user with recent activity
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
      take: limit * 3, // Fetch more to have enough activities after processing
    });

    // Build activities from lead data
    const activities: Activity[] = [];

    for (const lead of leads) {
      // Check for enrollment (highest priority)
      if (lead.enrolledAt && new Date(lead.enrolledAt) >= startDate) {
        activities.push({
          id: `enrollment-${lead.id}`,
          type: "ENROLLMENT",
          description: `${lead.name} iscritto al corso ${lead.course?.name || ""}`,
          leadId: lead.id,
          leadName: lead.name,
          userId: userId,
          createdAt: lead.enrolledAt.toISOString(),
          metadata: {
            courseName: lead.course?.name,
          },
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
          metadata: {
            callOutcome: lead.callOutcome || undefined,
          },
        });
      }

      // Check for lead creation (if created by this user)
      if (lead.createdById === userId && new Date(lead.createdAt) >= startDate) {
        activities.push({
          id: `created-${lead.id}`,
          type: "LEAD_CREATED",
          description: `Creato lead ${lead.name}`,
          leadId: lead.id,
          leadName: lead.name,
          userId: userId,
          createdAt: lead.createdAt.toISOString(),
          metadata: {
            courseName: lead.course?.name,
          },
        });
      }

      // Check for status change (use updatedAt as proxy)
      // Only if status is not NUOVO and updatedAt is different from createdAt
      if (
        lead.status !== "NUOVO" &&
        lead.updatedAt.getTime() !== lead.createdAt.getTime() &&
        new Date(lead.updatedAt) >= startDate &&
        !lead.enrolledAt // Don't duplicate enrollment
      ) {
        const statusLabels: Record<string, string> = {
          CONTATTATO: "Contattato",
          IN_TRATTATIVA: "In Trattativa",
          ISCRITTO: "Iscritto",
          PERSO: "Perso",
        };

        // Only add if not already covered by contact or enrollment
        const hasContact = lead.contactedAt && 
          Math.abs(lead.contactedAt.getTime() - lead.updatedAt.getTime()) < 60000; // Within 1 minute
        
        if (!hasContact) {
          activities.push({
            id: `status-${lead.id}-${lead.updatedAt.getTime()}`,
            type: "STATUS_CHANGE",
            description: `${lead.name} spostato a ${statusLabels[lead.status] || lead.status}`,
            leadId: lead.id,
            leadName: lead.name,
            userId: userId,
            createdAt: lead.updatedAt.toISOString(),
            metadata: {
              newStatus: lead.status,
            },
          });
        }
      }
    }

    // Sort by date descending and limit
    activities.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json(limitedActivities);
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle attività" },
      { status: 500 }
    );
  }
}
