import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/sanity/merge - Merge duplicate leads into one
// Body: { primaryId: string, duplicateIds: string[] }
// The primary lead is kept, duplicates are merged into it and then deleted
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can merge leads
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { primaryId, duplicateIds } = body;

    if (!primaryId || !duplicateIds || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { error: "primaryId and duplicateIds[] are required" },
        { status: 400 }
      );
    }

    // Verify all leads exist and are for the same course
    const allIds = [primaryId, ...duplicateIds];
    const leads = await prisma.lead.findMany({
      where: { id: { in: allIds } },
      include: {
        activities: true,
        tasks: true,
        course: { select: { name: true } },
      },
    });

    if (leads.length !== allIds.length) {
      return NextResponse.json(
        { error: "One or more leads not found" },
        { status: 404 }
      );
    }

    // Verify all leads are for the same course
    const courseIds = new Set(leads.map(l => l.courseId));
    if (courseIds.size > 1) {
      return NextResponse.json(
        { error: "Cannot merge leads from different courses" },
        { status: 400 }
      );
    }

    const primaryLead = leads.find(l => l.id === primaryId);
    const duplicateLeads = leads.filter(l => l.id !== primaryId);

    if (!primaryLead) {
      return NextResponse.json(
        { error: "Primary lead not found" },
        { status: 404 }
      );
    }

    // Merge logic: combine data from duplicates into primary
    // Priority: keep primary values, but fill in missing data from duplicates
    // For boolean fields: use OR (if any is true, result is true)
    // For dates: keep earliest createdAt, latest contactedAt/enrolledAt
    
    let mergedEmail = primaryLead.email;
    let mergedPhone = primaryLead.phone;
    let mergedNotes = primaryLead.notes || "";
    let mergedContacted = primaryLead.contacted;
    let mergedContactedAt = primaryLead.contactedAt;
    let mergedContactedById = primaryLead.contactedById;
    let mergedIsTarget = primaryLead.isTarget;
    let mergedTargetNote = primaryLead.targetNote;
    let mergedEnrolled = primaryLead.enrolled;
    let mergedEnrolledAt = primaryLead.enrolledAt;
    let mergedCampaignId = primaryLead.campaignId;
    let mergedAssignedToId = primaryLead.assignedToId;
    let mergedAcquisitionCost = primaryLead.acquisitionCost;
    let mergedRevenue = primaryLead.revenue;
    let mergedAppointmentDate = primaryLead.appointmentDate;
    let mergedAppointmentNotes = primaryLead.appointmentNotes;
    let mergedCallOutcome = primaryLead.callOutcome;
    let mergedOutcomeNotes = primaryLead.outcomeNotes;

    // Track which duplicates contributed data
    const mergeNotes: string[] = [`[MERGE ${new Date().toISOString()}] Uniti ${duplicateLeads.length} duplicati:`];

    for (const dup of duplicateLeads) {
      mergeNotes.push(`- ID: ${dup.id}, Nome: ${dup.name}, Creato: ${dup.createdAt.toISOString()}`);

      // Fill in missing contact info
      if (!mergedEmail && dup.email) {
        mergedEmail = dup.email;
        mergeNotes.push(`  > Email presa da duplicato: ${dup.email}`);
      }
      if (!mergedPhone && dup.phone) {
        mergedPhone = dup.phone;
        mergeNotes.push(`  > Telefono preso da duplicato: ${dup.phone}`);
      }

      // Combine notes
      if (dup.notes) {
        mergedNotes += `\n\n[Da duplicato ${dup.id}]: ${dup.notes}`;
      }

      // Boolean OR for contacted/enrolled/isTarget
      if (dup.contacted && !mergedContacted) {
        mergedContacted = true;
        mergedContactedAt = dup.contactedAt;
        mergedContactedById = dup.contactedById;
      }
      if (dup.isTarget && !mergedIsTarget) {
        mergedIsTarget = true;
        mergedTargetNote = dup.targetNote;
      }
      if (dup.enrolled && !mergedEnrolled) {
        mergedEnrolled = true;
        mergedEnrolledAt = dup.enrolledAt;
        mergedRevenue = dup.revenue;
        mergeNotes.push(`  > Iscrizione presa da duplicato`);
      }

      // Fill in missing campaign/assignment
      if (!mergedCampaignId && dup.campaignId) {
        mergedCampaignId = dup.campaignId;
      }
      if (!mergedAssignedToId && dup.assignedToId) {
        mergedAssignedToId = dup.assignedToId;
      }

      // Fill in missing cost/revenue
      if (!mergedAcquisitionCost && dup.acquisitionCost) {
        mergedAcquisitionCost = dup.acquisitionCost;
      }
      if (!mergedRevenue && dup.revenue) {
        mergedRevenue = dup.revenue;
      }

      // Fill in appointment info
      if (!mergedAppointmentDate && dup.appointmentDate) {
        mergedAppointmentDate = dup.appointmentDate;
        mergedAppointmentNotes = dup.appointmentNotes;
      }
      if (!mergedCallOutcome && dup.callOutcome) {
        mergedCallOutcome = dup.callOutcome;
        mergedOutcomeNotes = dup.outcomeNotes;
      }
    }

    // Perform the merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Move all activities from duplicates to primary
      await tx.leadActivity.updateMany({
        where: { leadId: { in: duplicateIds } },
        data: { leadId: primaryId },
      });

      // 2. Move all tasks from duplicates to primary
      await tx.task.updateMany({
        where: { leadId: { in: duplicateIds } },
        data: { leadId: primaryId },
      });

      // 3. Update primary lead with merged data
      const updatedLead = await tx.lead.update({
        where: { id: primaryId },
        data: {
          email: mergedEmail,
          phone: mergedPhone,
          notes: mergedNotes + "\n\n" + mergeNotes.join("\n"),
          contacted: mergedContacted,
          contactedAt: mergedContactedAt,
          contactedById: mergedContactedById,
          isTarget: mergedIsTarget,
          targetNote: mergedTargetNote,
          enrolled: mergedEnrolled,
          enrolledAt: mergedEnrolledAt,
          campaignId: mergedCampaignId,
          assignedToId: mergedAssignedToId,
          acquisitionCost: mergedAcquisitionCost,
          revenue: mergedRevenue,
          appointmentDate: mergedAppointmentDate,
          appointmentNotes: mergedAppointmentNotes,
          callOutcome: mergedCallOutcome,
          outcomeNotes: mergedOutcomeNotes,
        },
        include: {
          course: { select: { name: true } },
          campaign: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
      });

      // 4. Delete duplicate leads
      await tx.lead.deleteMany({
        where: { id: { in: duplicateIds } },
      });

      // 5. Log the merge action as an activity on the primary lead
      await tx.leadActivity.create({
        data: {
          leadId: primaryId,
          userId: session.user.id,
          type: "NOTE",
          description: `Lead unificato: ${duplicateIds.length} duplicati eliminati e dati combinati`,
        },
      });

      return updatedLead;
    });

    return NextResponse.json({
      success: true,
      message: `Merged ${duplicateIds.length} duplicates into primary lead`,
      mergedLead: result,
      deletedIds: duplicateIds,
    });
  } catch (error) {
    console.error("Error merging leads:", error);
    return NextResponse.json(
      { error: "Failed to merge leads", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
