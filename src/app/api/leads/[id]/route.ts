import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification, createNotificationForRole } from "@/lib/notifications";
import { ActivityType } from "@prisma/client";

// GET /api/leads/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        course: true,
        campaign: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        contactedBy: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

// PUT /api/leads/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await request.json();

    // Ottieni il lead attuale per confrontare i cambiamenti
    const currentLead = await prisma.lead.findUnique({
      where: { id },
      select: { status: true, assignedToId: true, name: true, contacted: true, enrolled: true },
    });

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.courseId !== undefined) updateData.courseId = body.courseId;
    if (body.campaignId !== undefined) updateData.campaignId = body.campaignId;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
    if (body.isTarget !== undefined) updateData.isTarget = body.isTarget;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // Auto-set enrolled=true when status changes to ISCRITTO
      if (body.status === "ISCRITTO") {
        updateData.enrolled = true;
        if (!body.enrolledAt) {
          updateData.enrolledAt = new Date();
        }
      }
    }
    
    // Contact tracking
    if (body.contacted !== undefined) {
      updateData.contacted = body.contacted;
      if (body.contacted && !body.contactedAt) {
        updateData.contactedAt = new Date();
      }
    }
    if (body.contactedById !== undefined) updateData.contactedById = body.contactedById;
    if (body.callOutcome !== undefined) updateData.callOutcome = body.callOutcome;
    if (body.outcomeNotes !== undefined) updateData.outcomeNotes = body.outcomeNotes;
    
    // Enrollment tracking
    if (body.enrolled !== undefined) {
      updateData.enrolled = body.enrolled;
      if (body.enrolled && !body.enrolledAt) {
        updateData.enrolledAt = new Date();
      }
    }
    
    // Acquisition cost tracking (for Marketing)
    if (body.acquisitionCost !== undefined) {
      updateData.acquisitionCost = body.acquisitionCost;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Log activities for changes
    if (session?.user?.id) {
      const activities: Array<{ leadId: string; userId: string; type: ActivityType; description: string; metadata?: object }> = [];

      // Status change
      if (body.status && body.status !== currentLead?.status) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'STATUS_CHANGE' as ActivityType,
          description: `Status cambiato da ${currentLead?.status || 'N/A'} a ${body.status}`,
          metadata: { oldStatus: currentLead?.status, newStatus: body.status },
        });
      }

      // Contact logged
      if (body.contacted && !currentLead?.contacted) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'CONTACT' as ActivityType,
          description: `Lead contattato${body.callOutcome ? ` - Esito: ${body.callOutcome}` : ''}`,
          metadata: { callOutcome: body.callOutcome, outcomeNotes: body.outcomeNotes },
        });
      }

      // Call outcome update (even if already contacted)
      if (body.callOutcome && currentLead?.contacted) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'CALL' as ActivityType,
          description: `Chiamata registrata - Esito: ${body.callOutcome}`,
          metadata: { callOutcome: body.callOutcome, outcomeNotes: body.outcomeNotes },
        });
      }

      // Enrollment
      if (body.enrolled && !currentLead?.enrolled) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'ENROLLMENT' as ActivityType,
          description: `Lead iscritto al corso ${lead.course?.name || ''}`,
          metadata: { courseId: lead.course?.id, courseName: lead.course?.name },
        });
      }

      // Assignment change
      if (body.assignedToId && body.assignedToId !== currentLead?.assignedToId) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'ASSIGNMENT' as ActivityType,
          description: `Lead assegnato a ${lead.assignedTo?.name || 'N/A'}`,
          metadata: { oldAssignedToId: currentLead?.assignedToId, newAssignedToId: body.assignedToId },
        });
      }

      // Create all activities
      if (activities.length > 0) {
        await prisma.leadActivity.createMany({ data: activities });
      }
    }

    // Notifica quando lo status cambia a ISCRITTO
    if (body.status === "ISCRITTO" && currentLead?.status !== "ISCRITTO") {
      // Notifica gli admin
      await createNotificationForRole(
        "ADMIN",
        "LEAD_ENROLLED",
        "Nuovo iscritto!",
        `${lead.name} si e iscritto al corso ${lead.course?.name || ""}`,
        `/admin/leads/${lead.id}`
      );
      // Notifica il marketing
      await createNotificationForRole(
        "MARKETING",
        "LEAD_ENROLLED",
        "Nuovo iscritto!",
        `${lead.name} si e iscritto al corso ${lead.course?.name || ""}`,
        `/marketing/leads`
      );
    }

    // Notifica quando viene riassegnato a un nuovo commerciale
    if (
      body.assignedToId &&
      body.assignedToId !== currentLead?.assignedToId
    ) {
      await createNotification(
        body.assignedToId,
        "LEAD_ASSIGNED",
        "Lead assegnato",
        `Ti e stato assegnato il lead: ${lead.name}`,
        `/commercial/leads/${lead.id}`
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
