import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/leads/perso - Fetch all PERSO leads for the recovery pool
// Accessible by COMMERCIAL and ADMIN roles
// This endpoint bypasses the normal visibility rules to allow Commercials
// to see and claim ANY PERSO lead in the system, not just their own
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only COMMERCIAL and ADMIN can access this endpoint
    const userRole = session.user.role;
    if (userRole !== "COMMERCIAL" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Commercial or Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Search filters
    const search = searchParams.get("search");
    const courseId = searchParams.get("courseId");
    const assignedToId = searchParams.get("assignedToId"); // Filter by previous owner
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Build where clause - always filter for PERSO status
    const where: Record<string, unknown> = {
      status: "PERSO",
    };

    // Search by name, email, or phone
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by course
    if (courseId) {
      where.courseId = courseId;
    }

    // Filter by previous assignee (commercial)
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    // Get total count for pagination
    const totalCount = await prisma.lead.count({ where });

    // Fetch PERSO leads with relevant includes
    const leads = await prisma.lead.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        campaign: { 
          select: { 
            id: true, 
            name: true, 
            platform: true,
            masterCampaign: { select: { id: true, name: true } }
          } 
        },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { lostAt: "desc" }, // Most recently lost first
        { createdAt: "desc" },
      ],
      skip,
      take: pageSize,
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get list of commercials who have PERSO leads (for filter dropdown)
    // Only fetch this on first page to avoid repeated queries
    let commercialsWithPersoLeads: Array<{ id: string; name: string; count: number }> = [];
    if (page === 1) {
      const commercialStats = await prisma.lead.groupBy({
        by: ['assignedToId'],
        where: { status: 'PERSO', assignedToId: { not: null } },
        _count: { id: true },
      });

      if (commercialStats.length > 0) {
        const commercialIds = commercialStats
          .map(s => s.assignedToId)
          .filter((id): id is string => id !== null);
        
        const commercials = await prisma.user.findMany({
          where: { id: { in: commercialIds } },
          select: { id: true, name: true },
        });

        commercialsWithPersoLeads = commercials.map(c => ({
          id: c.id,
          name: c.name,
          count: commercialStats.find(s => s.assignedToId === c.id)?._count.id || 0,
        })).sort((a, b) => b.count - a.count); // Sort by count descending
      }
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
      commercials: commercialsWithPersoLeads,
    });
  } catch (error) {
    console.error("Error fetching PERSO leads:", error);
    return NextResponse.json({ error: "Failed to fetch PERSO leads" }, { status: 500 });
  }
}
