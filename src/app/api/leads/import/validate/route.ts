import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Fuse from "fuse.js";

interface ImportLead {
  name: string;
  email: string | null;
  phone: string | null;
  courseName: string | null;
  campaignName: string | null;
  status: string;
  notes: string | null;
  assignedToName: string | null;
}

interface FuzzyWarning {
  type: "course" | "commercial";
  inputValue: string;
  suggestions: { name: string; score: number }[];
  count: number; // How many leads have this value
}

// POST /api/leads/import/validate - Validate import data and return warnings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { leads } = body as { leads: ImportLead[] };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "Nessun lead da validare" },
        { status: 400 }
      );
    }

    // Fetch existing data
    const [courses, users] = await Promise.all([
      prisma.course.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({
        where: { role: "COMMERCIAL" },
        select: { id: true, username: true, name: true },
      }),
    ]);

    // Setup Fuse.js for fuzzy searching
    const courseFuse = new Fuse(courses, {
      keys: ["name"],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
    });

    const userFuse = new Fuse(users, {
      keys: ["name", "username"],
      threshold: 0.4,
      includeScore: true,
    });

    // Create exact match sets for quick lookup
    const existingCourseNames = new Set(
      courses.map((c) => c.name.toLowerCase().trim())
    );
    const existingUserNames = new Set(
      users.flatMap((u) => [
        u.name.toLowerCase().trim(),
        u.username.toLowerCase().trim(),
      ])
    );

    // Track unique values that don't have exact matches
    const unmatchedCourses = new Map<string, number>(); // courseName -> count
    const unmatchedCommercials = new Map<string, number>(); // commercialName -> count

    // Analyze leads for unmatched values
    for (const lead of leads) {
      // Check course
      if (lead.courseName) {
        const courseNameLower = lead.courseName.trim().toLowerCase();
        if (!existingCourseNames.has(courseNameLower)) {
          const count = unmatchedCourses.get(lead.courseName.trim()) || 0;
          unmatchedCourses.set(lead.courseName.trim(), count + 1);
        }
      }

      // Check commercial
      if (lead.assignedToName) {
        const commercialNameLower = lead.assignedToName.trim().toLowerCase();
        if (!existingUserNames.has(commercialNameLower)) {
          const count = unmatchedCommercials.get(lead.assignedToName.trim()) || 0;
          unmatchedCommercials.set(lead.assignedToName.trim(), count + 1);
        }
      }
    }

    // Build warnings with fuzzy suggestions
    const warnings: FuzzyWarning[] = [];

    // Process unmatched courses
    Array.from(unmatchedCourses.entries()).forEach(([courseName, count]) => {
      const fuzzyResults = courseFuse.search(courseName);
      const suggestions = fuzzyResults.slice(0, 3).map((result) => ({
        name: result.item.name,
        score: Math.round((1 - (result.score || 0)) * 100), // Convert to percentage similarity
      }));

      warnings.push({
        type: "course",
        inputValue: courseName,
        suggestions,
        count,
      });
    });

    // Process unmatched commercials
    Array.from(unmatchedCommercials.entries()).forEach(([commercialName, count]) => {
      const fuzzyResults = userFuse.search(commercialName);
      const suggestions = fuzzyResults.slice(0, 3).map((result) => ({
        name: result.item.name,
        score: Math.round((1 - (result.score || 0)) * 100),
      }));

      warnings.push({
        type: "commercial",
        inputValue: commercialName,
        suggestions,
        count,
      });
    });

    // Summary stats
    const stats = {
      totalLeads: leads.length,
      newCourses: unmatchedCourses.size,
      unmatchedCommercials: unmatchedCommercials.size,
      leadsWithUnmatchedCourse: Array.from(unmatchedCourses.values()).reduce((a, b) => a + b, 0),
      leadsWithUnmatchedCommercial: Array.from(unmatchedCommercials.values()).reduce((a, b) => a + b, 0),
    };

    return NextResponse.json({
      valid: true,
      warnings,
      stats,
      requiresConfirmation: warnings.length > 0,
      message: warnings.length > 0
        ? `Trovati ${warnings.length} valori che non corrispondono ai dati esistenti. Verifica prima di procedere.`
        : "Tutti i dati corrispondono ai valori esistenti. Pronto per l'importazione.",
    });
  } catch (error) {
    console.error("Error validating import:", error);
    return NextResponse.json(
      { error: "Errore durante la validazione dell'importazione" },
      { status: 500 }
    );
  }
}
