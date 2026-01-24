import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/sanity/duplicates - Find potential duplicate leads
// Duplicates are leads with the same name (case-insensitive) in the same course
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access sanity checks
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Find all leads grouped by normalized name + course
    const leads = await prisma.lead.findMany({
      where: courseId ? { courseId } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        courseId: true,
        enrolled: true,
        contacted: true,
        status: true,
        source: true,
        createdAt: true,
        notes: true,
        course: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group leads by normalized name + courseId
    const duplicateGroups = new Map<string, typeof leads>();
    
    for (const lead of leads) {
      // Normalize name: lowercase, trim, remove extra spaces
      const normalizedName = lead.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
      
      const key = `${normalizedName}|${lead.courseId}`;
      
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(lead);
    }

    // Filter to only groups with more than one lead (actual duplicates)
    type LeadWithRelations = typeof leads[number];
    const duplicates: Array<{
      key: string;
      normalizedName: string;
      courseName: string;
      courseId: string;
      count: number;
      leads: LeadWithRelations[];
      hasEnrolled: boolean;
      recommendation: string;
    }> = [];

    const entries = Array.from(duplicateGroups.entries());
    for (const [key, groupLeads] of entries) {
      if (groupLeads.length > 1) {
        const hasEnrolled = groupLeads.some((l: LeadWithRelations) => l.enrolled);
        const allEnrolled = groupLeads.every((l: LeadWithRelations) => l.enrolled);
        const [normalizedName] = key.split("|");
        
        // Generate recommendation
        let recommendation = "";
        if (allEnrolled) {
          recommendation = "Tutti iscritti - possibile doppio pagamento, verificare";
        } else if (hasEnrolled) {
          recommendation = "Uno iscritto - unire i record non iscritti in quello iscritto";
        } else {
          recommendation = "Nessuno iscritto - unire in un unico record";
        }

        // Skip if all are enrolled and we don't want resolved (potential false positives)
        if (!includeResolved && allEnrolled) {
          continue;
        }

        duplicates.push({
          key,
          normalizedName,
          courseName: groupLeads[0].course?.name || "Unknown",
          courseId: groupLeads[0].courseId,
          count: groupLeads.length,
          leads: groupLeads,
          hasEnrolled,
          recommendation,
        });
      }
    }

    // Sort by count (most duplicates first), then by course name
    duplicates.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.courseName.localeCompare(b.courseName);
    });

    // Summary stats
    const stats = {
      totalDuplicateGroups: duplicates.length,
      totalAffectedLeads: duplicates.reduce((sum, d) => sum + d.count, 0),
      groupsWithEnrolled: duplicates.filter(d => d.hasEnrolled).length,
      potentialDoublePurchases: duplicates.filter(d => 
        d.leads.filter(l => l.enrolled).length > 1
      ).length,
    };

    return NextResponse.json({
      stats,
      duplicates,
    });
  } catch (error) {
    console.error("Error finding duplicates:", error);
    return NextResponse.json(
      { error: "Failed to find duplicates" },
      { status: 500 }
    );
  }
}
