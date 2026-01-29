import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Analyze campaigns (dry run)
// POST - Execute migration
export async function GET(request: NextRequest) {
  try {
    // Require admin session
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all campaigns
    const campaigns = await prisma.campaign.findMany({
      include: {
        course: { select: { id: true, name: true } },
        masterCampaign: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { name: "asc" },
    });

    // Get existing master campaigns
    const masterCampaigns = await prisma.masterCampaign.findMany({
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { campaigns: true } },
      },
    });

    // Analyze campaigns
    const analysis = {
      totalCampaigns: campaigns.length,
      campaignsWithMaster: campaigns.filter(c => c.masterCampaignId).length,
      campaignsWithoutMaster: campaigns.filter(c => !c.masterCampaignId).length,
      existingMasterCampaigns: masterCampaigns.length,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        platform: c.platform,
        courseId: c.courseId,
        courseName: c.course?.name || "N/A",
        hasMasterCampaign: !!c.masterCampaignId,
        masterCampaignName: c.masterCampaign?.name || null,
        leadCount: c._count.leads,
        // Parse base name (remove " - PLATFORM" suffix)
        suggestedMasterName: extractBaseName(c.name, c.platform),
      })),
      masterCampaigns: masterCampaigns.map(mc => ({
        id: mc.id,
        name: mc.name,
        courseId: mc.courseId,
        courseName: mc.course?.name || "N/A",
        campaignCount: mc._count.campaigns,
      })),
    };

    // Group campaigns by suggested master name + course
    const groupedMigrations: Record<string, {
      masterName: string;
      courseId: string | null;
      courseName: string;
      campaigns: { id: string; name: string; platform: string; leadCount: number }[];
    }> = {};

    for (const c of analysis.campaigns) {
      if (!c.hasMasterCampaign) {
        const key = `${c.suggestedMasterName}|${c.courseId}`;
        if (!groupedMigrations[key]) {
          groupedMigrations[key] = {
            masterName: c.suggestedMasterName,
            courseId: c.courseId,
            courseName: c.courseName,
            campaigns: [],
          };
        }
        groupedMigrations[key].campaigns.push({
          id: c.id,
          name: c.name,
          platform: c.platform,
          leadCount: c.leadCount,
        });
      }
    }

    return NextResponse.json({
      status: "analysis",
      message: "Dry run - no changes made. POST to this endpoint to execute migration.",
      analysis,
      proposedMigrations: Object.values(groupedMigrations),
      summary: {
        masterCampaignsToCreate: Object.keys(groupedMigrations).length,
        campaignsToUpdate: analysis.campaignsWithoutMaster,
      },
    });
  } catch (error) {
    console.error("Migration analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin session
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get campaigns without master
    const campaigns = await prisma.campaign.findMany({
      where: { masterCampaignId: null },
      include: {
        course: { select: { id: true, name: true } },
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "No campaigns need migration - all already have MasterCampaigns",
        migratedCount: 0,
      });
    }

    const results: {
      masterCampaignsCreated: { id: string; name: string; courseId: string | null }[];
      campaignsUpdated: { id: string; name: string; masterCampaignId: string }[];
      errors: { campaignId: string; error: string }[];
    } = {
      masterCampaignsCreated: [],
      campaignsUpdated: [],
      errors: [],
    };

    // Group by base name + course
    const groups = new Map<string, {
      masterName: string;
      courseId: string | null;
      campaigns: typeof campaigns;
    }>();

    for (const c of campaigns) {
      const masterName = extractBaseName(c.name, c.platform);
      const key = `${masterName}|${c.courseId}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          masterName,
          courseId: c.courseId,
          campaigns: [],
        });
      }
      groups.get(key)!.campaigns.push(c);
    }

    // Process each group
    for (const group of Array.from(groups.values())) {
      try {
        // Skip campaigns without course - can't create MasterCampaign
        if (!group.courseId) {
          for (const c of group.campaigns) {
            results.errors.push({
              campaignId: c.id,
              error: `Campaign "${c.name}" has no courseId - cannot create MasterCampaign`,
            });
          }
          continue;
        }

        // Check if MasterCampaign already exists
        let masterCampaign = await prisma.masterCampaign.findFirst({
          where: {
            name: group.masterName,
            courseId: group.courseId,
          },
        });

        // Create if doesn't exist
        if (!masterCampaign) {
          masterCampaign = await prisma.masterCampaign.create({
            data: {
              name: group.masterName,
              courseId: group.courseId,
              status: "ACTIVE",
            },
          });
          results.masterCampaignsCreated.push({
            id: masterCampaign.id,
            name: masterCampaign.name,
            courseId: masterCampaign.courseId,
          });
        }

        // Update all campaigns in this group
        for (const c of group.campaigns) {
          await prisma.campaign.update({
            where: { id: c.id },
            data: { masterCampaignId: masterCampaign.id },
          });
          results.campaignsUpdated.push({
            id: c.id,
            name: c.name,
            masterCampaignId: masterCampaign.id,
          });
        }
      } catch (error) {
        for (const c of group.campaigns) {
          results.errors.push({
            campaignId: c.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return NextResponse.json({
      status: "complete",
      message: "Migration completed",
      results,
      summary: {
        masterCampaignsCreated: results.masterCampaignsCreated.length,
        campaignsUpdated: results.campaignsUpdated.length,
        errors: results.errors.length,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper function to extract base name from campaign name
function extractBaseName(campaignName: string, platform: string): string {
  // Common patterns:
  // "Summer Sale - META" -> "Summer Sale"
  // "Campaign Name - GOOGLE_ADS" -> "Campaign Name"
  // "Import - Course Name - META" -> "Import - Course Name"
  
  const platformSuffixes = [
    ` - ${platform}`,
    ` - META`,
    ` - GOOGLE_ADS`,
    ` - LINKEDIN`,
    ` - TIKTOK`,
    ` META`,
    ` GOOGLE_ADS`,
    ` LINKEDIN`,
    ` TIKTOK`,
  ];

  let baseName = campaignName;
  
  for (const suffix of platformSuffixes) {
    if (baseName.endsWith(suffix)) {
      baseName = baseName.slice(0, -suffix.length).trim();
      break;
    }
  }

  return baseName || campaignName;
}
