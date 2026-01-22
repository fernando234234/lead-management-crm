import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/search?q={query} - Global search across leads, campaigns, courses, and users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({
        leads: [],
        campaigns: [],
        courses: [],
        users: [],
      });
    }

    const isAdmin = session.user.role === "ADMIN";

    // Search leads
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        course: {
          select: { name: true },
        },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Search campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        platform: true,
        course: {
          select: { name: true },
        },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Search courses
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        price: true,
        active: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Search users (admin only)
    let users: { id: string; name: string; email: string | null; username: string; role: string }[] = [];
    if (isAdmin) {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      });
    }

    // Format response
    const formattedLeads = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      courseName: lead.course.name,
      status: lead.status,
    }));

    const formattedCampaigns = campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      courseName: campaign.course?.name || "N/D",
    }));

    const formattedCourses = courses.map((course) => ({
      id: course.id,
      name: course.name,
      price: Number(course.price),
      active: course.active,
    }));

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));

    return NextResponse.json({
      leads: formattedLeads,
      campaigns: formattedCampaigns,
      courses: formattedCourses,
      ...(isAdmin && { users: formattedUsers }),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
