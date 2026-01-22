import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

interface ImportLead {
  name: string;
  email: string | null;
  phone: string | null;
  courseName: string | null;
  campaignName: string | null;
  status: string;
  notes: string | null;
  assignedToName: string | null; // Changed from email to name-based lookup
}

interface ImportError {
  row: number;
  message: string;
}

// POST /api/leads/import - Import multiple leads
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only ADMIN can import leads
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { leads } = body as { leads: ImportLead[] };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "Nessun lead da importare" },
        { status: 400 }
      );
    }

    // Fetch all courses and campaigns for name matching
    const [courses, campaigns, users] = await Promise.all([
      prisma.course.findMany({ select: { id: true, name: true } }),
      prisma.campaign.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ 
        where: { role: "COMMERCIAL" },
        select: { id: true, username: true, name: true } 
      }),
    ]);

    // Create lookup maps for efficient matching
    const courseMap = new Map(
      courses.map((c) => [c.name.toLowerCase().trim(), c.id])
    );
    const campaignMap = new Map(
      campaigns.map((c) => [c.name.toLowerCase().trim(), c.id])
    );
    // Map by username (e.g., "simone.") and by name (e.g., "Simone")
    const userNameMap = new Map(
      users.flatMap((u) => [
        [u.username.toLowerCase().trim(), { id: u.id, name: u.name }],
        [u.name.toLowerCase().trim(), { id: u.id, name: u.name }],
      ])
    );

    // Get default course (first active course)
    const defaultCourse = courses[0];
    if (!defaultCourse) {
      return NextResponse.json(
        { error: "Nessun corso disponibile. Crea prima un corso." },
        { status: 400 }
      );
    }

    const successfulLeads: { id: string; assignedToId?: string | null; name: string }[] = [];
    const errors: ImportError[] = [];

    // Process leads in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const lead = batch[j];
        const rowNumber = i + j + 2; // +2 because row 1 is headers, index is 0-based

        try {
          // Validate required fields
          if (!lead.name || lead.name.trim().length === 0) {
            errors.push({
              row: rowNumber,
              message: "Il campo 'nome' è obbligatorio",
            });
            continue;
          }

          // Find or create course by name
          let courseId = "";
          if (lead.courseName) {
            const courseNameClean = lead.courseName.trim();
            const foundCourseId = courseMap.get(courseNameClean.toLowerCase());
            
            if (foundCourseId) {
              courseId = foundCourseId;
            } else {
              // Try partial match first to avoid duplicates with slight variations
              const partialMatch = Array.from(courseMap.entries()).find(([name]) =>
                name.includes(courseNameClean.toLowerCase()) ||
                courseNameClean.toLowerCase().includes(name)
              );
              
              if (partialMatch) {
                courseId = partialMatch[1];
              } else {
                // Create new course (Condition 2: Extract courses from CSV)
                const newCourse = await prisma.course.create({
                  data: {
                    name: courseNameClean,
                    price: 0, // Default price, can be updated later
                    active: true,
                  }
                });
                courseId = newCourse.id;
                // Add to map to reuse for subsequent rows
                courseMap.set(courseNameClean.toLowerCase(), newCourse.id);
              }
            }
          } else if (defaultCourse) {
             // Fallback only if no course name provided at all
             courseId = defaultCourse.id;
          } else {
             errors.push({
               row: rowNumber,
               message: "Nome corso mancante e nessun corso di default disponibile",
             });
             continue;
          }

          // Find campaign by name (case-insensitive)
          let campaignId: string | null = null;
          if (lead.campaignName) {
            const foundCampaignId = campaignMap.get(lead.campaignName.toLowerCase().trim());
            if (foundCampaignId) {
              campaignId = foundCampaignId;
            } else {
              // Try partial match
              const partialMatch = Array.from(campaignMap.entries()).find(([name]) =>
                name.includes(lead.campaignName!.toLowerCase().trim()) ||
                lead.campaignName!.toLowerCase().trim().includes(name)
              );
              if (partialMatch) {
                campaignId = partialMatch[1];
              }
            }
          }

          // Find user by name or username (case-insensitive)
          let assignedToId: string | null = null;
          if (lead.assignedToName) {
            const foundUser = userNameMap.get(lead.assignedToName.toLowerCase().trim());
            if (foundUser) {
              assignedToId = foundUser.id;
            }
          }

          // Validate status
          const validStatuses = ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO", "PERSO"];
          const status = validStatuses.includes(lead.status?.toUpperCase() || "")
            ? lead.status.toUpperCase()
            : "NUOVO";

          // Create the lead
          const createdLead = await prisma.lead.create({
            data: {
              name: lead.name.trim(),
              email: lead.email?.trim() || null,
              phone: lead.phone?.trim() || null,
              courseId,
              campaignId,
              assignedToId,
              status: status as "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO",
              notes: lead.notes?.trim() || null,
              isTarget: false,
              contacted: status === "CONTATTATO" || status === "IN_TRATTATIVA" || status === "ISCRITTO",
              enrolled: status === "ISCRITTO",
            },
          });

          successfulLeads.push({
            id: createdLead.id,
            assignedToId: createdLead.assignedToId,
            name: createdLead.name,
          });
        } catch (error) {
          console.error(`Error importing lead at row ${rowNumber}:`, error);
          errors.push({
            row: rowNumber,
            message: error instanceof Error ? error.message : "Errore sconosciuto",
          });
        }
      }
    }

    // Send notifications to assigned commercials
    const assignedLeadsByUser = new Map<string, string[]>();
    for (const lead of successfulLeads) {
      if (lead.assignedToId) {
        const existing = assignedLeadsByUser.get(lead.assignedToId) || [];
        existing.push(lead.name);
        assignedLeadsByUser.set(lead.assignedToId, existing);
      }
    }

    // Create notifications for each commercial
    const entries = Array.from(assignedLeadsByUser.entries());
    for (const entry of entries) {
      const userId = entry[0];
      const leadNames = entry[1];
      try {
        await createNotification(
          userId,
          "LEAD_ASSIGNED",
          "Nuovi lead assegnati",
          `Ti sono stati assegnati ${leadNames.length} nuovi lead: ${leadNames.slice(0, 3).join(", ")}${leadNames.length > 3 ? ` e altri ${leadNames.length - 3}` : ""}`,
          "/commercial/leads"
        );
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
        // Don't fail the import for notification errors
      }
    }

    return NextResponse.json({
      success: successfulLeads.length,
      errors,
      message: `Importati ${successfulLeads.length} lead con successo${errors.length > 0 ? `, ${errors.length} errori` : ""}`,
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Errore durante l'importazione dei lead" },
      { status: 500 }
    );
  }
}
