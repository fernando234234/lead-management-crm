import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification, createNotificationForRole } from "@/lib/notifications";
import { ActivityType } from "@prisma/client";

// ============================================================================
// STATUS COMPUTATION LOGIC
// ============================================================================
// Status is COMPUTED based on lead state, not manually set by users.
// Priority order (first match wins):
// 1. enrolled = true                              → ISCRITTO
// 2. callOutcome = NEGATIVO                       → PERSO
// 3. callAttempts >= 8 (with RICHIAMARE)          → PERSO
// 4. 15+ days since firstAttemptAt (stale lead)   → PERSO
// 5. callOutcome = POSITIVO                       → IN_TRATTATIVA
// 6. contacted = true                             → CONTATTATO
// 7. else                                         → NUOVO
// ============================================================================

type ComputedStatus = "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO";

function computeLeadStatus(lead: {
  enrolled: boolean;
  contacted: boolean;
  callOutcome: string | null;
  callAttempts: number;
  firstAttemptAt: Date | null;
}): ComputedStatus {
  // 1. Enrolled = ISCRITTO (highest priority, terminal state)
  if (lead.enrolled) {
    return "ISCRITTO";
  }
  
  // 2. NEGATIVO = PERSO (immediate loss)
  if (lead.callOutcome === "NEGATIVO") {
    return "PERSO";
  }
  
  // 3. 8+ attempts with RICHIAMARE = PERSO (exhausted attempts)
  if (lead.callAttempts >= 8 && lead.callOutcome === "RICHIAMARE") {
    return "PERSO";
  }
  
  // 4. 15+ days since first attempt = PERSO (stale lead)
  if (lead.firstAttemptAt) {
    const daysSinceFirst = Math.floor(
      (new Date().getTime() - new Date(lead.firstAttemptAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceFirst >= 15 && !lead.enrolled && lead.callOutcome !== "POSITIVO") {
      return "PERSO";
    }
  }
  
  // 5. POSITIVO = IN_TRATTATIVA (interested, negotiating)
  if (lead.callOutcome === "POSITIVO") {
    return "IN_TRATTATIVA";
  }
  
  // 6. Contacted = CONTATTATO
  if (lead.contacted) {
    return "CONTATTATO";
  }
  
  // 7. Default = NUOVO
  return "NUOVO";
}

// GET /api/leads/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const currentLead = await prisma.lead.findUnique({
      where: { id },
      select: { 
        status: true, 
        assignedToId: true, 
        name: true, 
        contacted: true, 
        enrolled: true,
        isTarget: true,
        callAttempts: true,
        firstAttemptAt: true,
        lastAttemptAt: true,
        callOutcome: true,
      },
    });

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.courseId !== undefined) updateData.courseId = body.courseId;
    if (body.campaignId !== undefined) updateData.campaignId = body.campaignId;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // Binary fields
    if (body.contacted !== undefined) {
      updateData.contacted = body.contacted;
      if (body.contacted && !currentLead?.contacted) {
        updateData.contactedAt = new Date();
      }
    }
    if (body.contactedById !== undefined) updateData.contactedById = body.contactedById;
    
    if (body.isTarget !== undefined) updateData.isTarget = body.isTarget;
    if (body.targetNote !== undefined) updateData.targetNote = body.targetNote;
    
    if (body.enrolled !== undefined) {
      updateData.enrolled = body.enrolled;
      if (body.enrolled && !currentLead?.enrolled) {
        updateData.enrolledAt = new Date();
      }
    }
    
    // Call Outcomes (3 only):
    // - POSITIVO: Lead interested, in negotiation
    // - RICHIAMARE: No answer / call back later, counter +1
    // - NEGATIVO: Not interested, immediate PERSO
    // NOTE: Status is NO LONGER manually set - it's computed from lead state
    
    // Validate call outcome if provided
    const VALID_CALL_OUTCOMES = ['POSITIVO', 'RICHIAMARE', 'NEGATIVO'] as const;
    let newCallOutcome = currentLead?.callOutcome;
    let newCallAttempts = currentLead?.callAttempts || 0;
    let newFirstAttemptAt = currentLead?.firstAttemptAt;
    let newContacted = body.contacted !== undefined ? body.contacted : currentLead?.contacted;
    let newEnrolled = body.enrolled !== undefined ? body.enrolled : currentLead?.enrolled;
    
    if (body.callOutcome !== undefined) {
      if (!VALID_CALL_OUTCOMES.includes(body.callOutcome)) {
        return NextResponse.json(
          { error: `Invalid callOutcome. Must be one of: ${VALID_CALL_OUTCOMES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.callOutcome = body.callOutcome;
      newCallOutcome = body.callOutcome;
      
      newCallAttempts = (currentLead?.callAttempts || 0) + 1;
      updateData.callAttempts = newCallAttempts;
      updateData.lastAttemptAt = new Date();
      if (!currentLead?.firstAttemptAt) {
        updateData.firstAttemptAt = new Date();
        newFirstAttemptAt = new Date();
      }
      
      // POSITIVO = mark as contacted if not already
      if (body.callOutcome === 'POSITIVO') {
        if (!currentLead?.contacted) {
          updateData.contacted = true;
          updateData.contactedAt = new Date();
          newContacted = true;
        }
      }
      
      // RICHIAMARE = also mark as contacted (we did reach them or tried)
      if (body.callOutcome === 'RICHIAMARE') {
        if (!currentLead?.contacted) {
          updateData.contacted = true;
          updateData.contactedAt = new Date();
          newContacted = true;
        }
      }
    }
    if (body.outcomeNotes !== undefined) updateData.outcomeNotes = body.outcomeNotes;
    
    // ========================================================================
    // COMPUTE STATUS automatically based on current state
    // This replaces manual status setting - users control inputs, system computes status
    // ========================================================================
    const computedStatus = computeLeadStatus({
      enrolled: newEnrolled || false,
      contacted: newContacted || false,
      callOutcome: newCallOutcome || null,
      callAttempts: newCallAttempts,
      firstAttemptAt: newFirstAttemptAt || null,
    });
    
    // Always set the computed status
    updateData.status = computedStatus;
    
    // Acquisition cost tracking (for Marketing)
    if (body.acquisitionCost !== undefined) {
      updateData.acquisitionCost = body.acquisitionCost;
    }
    
    // Revenue tracking (for custom pricing, discounts, etc.)
    if (body.revenue !== undefined) {
      updateData.revenue = body.revenue;
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

      // Status change (now auto-computed, so we log whenever it changes)
      if (computedStatus !== currentLead?.status) {
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'STATUS_CHANGE' as ActivityType,
          description: `Status cambiato automaticamente da ${currentLead?.status || 'N/A'} a ${computedStatus}`,
          metadata: { oldStatus: currentLead?.status, newStatus: computedStatus, autoComputed: true },
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

      // Log each call attempt (even if already contacted)
      if (body.callOutcome) {
        const attemptNumber = (currentLead?.callAttempts || 0) + 1;
        activities.push({
          leadId: id,
          userId: session.user.id,
          type: 'CALL' as ActivityType,
          description: `Chiamata #${attemptNumber} - Esito: ${body.callOutcome}${body.outcomeNotes ? ` - ${body.outcomeNotes}` : ''}`,
          metadata: { 
            callOutcome: body.callOutcome, 
            outcomeNotes: body.outcomeNotes,
            attemptNumber,
          },
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

    // Notifica quando status cambia a ISCRITTO o enrolled diventa true
    if ((computedStatus === "ISCRITTO" && currentLead?.status !== "ISCRITTO") || (body.enrolled && !currentLead?.enrolled)) {
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only ADMIN can delete leads
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

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
