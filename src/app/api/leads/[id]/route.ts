import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification, createNotificationForRole } from "@/lib/notifications";

// GET /api/leads/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Ottieni il lead attuale per confrontare i cambiamenti
    const currentLead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { status: true, assignedToId: true, name: true },
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
    if (body.status !== undefined) updateData.status = body.status;
    
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
      where: { id: params.id },
      data: updateData,
      include: {
        course: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

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
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
