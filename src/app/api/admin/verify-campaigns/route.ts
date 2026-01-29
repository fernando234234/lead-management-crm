import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get all campaigns with their master campaigns and spend
    const campaigns = await prisma.campaign.findMany({
      include: {
        course: { select: { id: true, name: true } },
        masterCampaign: { select: { id: true, name: true } },
        spendRecords: {
          select: { id: true, amount: true, startDate: true },
          orderBy: { startDate: "desc" },
        },
        _count: { select: { leads: true } },
      },
      orderBy: { name: "asc" },
    });

    // 2. Get all master campaigns
    const masterCampaigns = await prisma.masterCampaign.findMany({
      include: {
        course: { select: { id: true, name: true } },
        campaigns: {
          select: { 
            id: true, 
            name: true, 
            platform: true, 
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 3. Get all courses
    const courses = await prisma.course.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // VERIFICATION 1: Campaigns without MasterCampaign
    const campaignsWithoutMaster = campaigns.filter(c => !c.masterCampaignId);

    // VERIFICATION 2: MasterCampaigns with "META" or platform in name (legacy issue)
    const masterCampaignsWithPlatformInName = masterCampaigns.filter(mc => 
      mc.name.includes("META") || 
      mc.name.includes("GOOGLE") || 
      mc.name.includes("LINKEDIN") || 
      mc.name.includes("TIKTOK") ||
      mc.name.includes(" - META") ||
      mc.name.includes(" - GOOGLE_ADS")
    );

    // VERIFICATION 3: Campaigns with spend records
    const campaignsWithSpend = campaigns.map(c => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      masterCampaignName: c.masterCampaign?.name || "NO MASTER",
      spendRecordsCount: c.spendRecords.length,
      totalSpend: c.spendRecords.reduce((sum: number, s) => sum + Number(s.amount), 0),
      leadCount: c._count.leads,
    }));

    // VERIFICATION 4: Campaigns grouped by course (for lead creation dropdown)
    const campaignsByCourse: Record<string, {
      courseName: string;
      masterCampaigns: {
        masterName: string;
        masterId: string | null;
        platforms: { id: string; platform: string; name: string; status: string; leadCount: number }[];
      }[];
    }> = {};

    for (const course of courses) {
      const courseCampaigns = campaigns.filter(c => c.courseId === course.id);
      
      // Group by master campaign
      const byMaster = new Map<string, typeof courseCampaigns>();
      for (const c of courseCampaigns) {
        const masterKey = c.masterCampaign?.id || `standalone-${c.id}`;
        if (!byMaster.has(masterKey)) {
          byMaster.set(masterKey, []);
        }
        byMaster.get(masterKey)!.push(c);
      }

      if (courseCampaigns.length > 0) {
        campaignsByCourse[course.id] = {
          courseName: course.name,
          masterCampaigns: Array.from(byMaster.entries()).map(([, cmpgns]) => ({
            masterName: cmpgns[0].masterCampaign?.name || cmpgns[0].name,
            masterId: cmpgns[0].masterCampaign?.id || null,
            platforms: cmpgns.map(c => ({
              id: c.id,
              platform: c.platform,
              name: c.name,
              status: c.status,
              leadCount: c._count.leads,
            })),
          })),
        };
      }
    }

    // VERIFICATION 5: Empty master campaigns (no campaigns linked)
    const emptyMasterCampaigns = masterCampaigns.filter(mc => mc.campaigns.length === 0);

    // VERIFICATION 6: Courses without any campaigns
    const coursesWithoutCampaigns = courses.filter(course => 
      !campaigns.some(c => c.courseId === course.id)
    );

    // VERIFICATION 7: Active campaigns per course (for lead assignment)
    const activeCampaignsByCourse = courses.map(course => {
      const courseCampaigns = campaigns.filter(c => 
        c.courseId === course.id && c.status === "ACTIVE"
      );
      return {
        courseId: course.id,
        courseName: course.name,
        activeCampaigns: courseCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          platform: c.platform,
          masterName: c.masterCampaign?.name || "NO MASTER",
        })),
        activeCampaignCount: courseCampaigns.length,
      };
    }).filter(c => c.activeCampaignCount > 0);

    // Summary
    const summary = {
      totalCampaigns: campaigns.length,
      campaignsWithMaster: campaigns.filter(c => c.masterCampaignId).length,
      campaignsWithoutMaster: campaignsWithoutMaster.length,
      totalMasterCampaigns: masterCampaigns.length,
      emptyMasterCampaigns: emptyMasterCampaigns.length,
      masterCampaignsWithPlatformInName: masterCampaignsWithPlatformInName.length,
      campaignsWithSpendRecords: campaigns.filter(c => c.spendRecords.length > 0).length,
      totalCourses: courses.length,
      coursesWithCampaigns: courses.length - coursesWithoutCampaigns.length,
      coursesWithoutCampaigns: coursesWithoutCampaigns.length,
    };

    return NextResponse.json({
      status: "verification",
      summary,
      issues: {
        campaignsWithoutMaster: campaignsWithoutMaster.map(c => ({
          id: c.id,
          name: c.name,
          platform: c.platform,
          courseName: c.course?.name,
        })),
        masterCampaignsWithPlatformInName: masterCampaignsWithPlatformInName.map(mc => ({
          id: mc.id,
          name: mc.name,
          courseName: mc.course?.name,
          campaignCount: mc.campaigns.length,
        })),
        emptyMasterCampaigns: emptyMasterCampaigns.map(mc => ({
          id: mc.id,
          name: mc.name,
          courseName: mc.course?.name,
        })),
        coursesWithoutCampaigns: coursesWithoutCampaigns,
      },
      data: {
        campaignsWithSpend,
        campaignsByCourse,
        activeCampaignsByCourse,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
