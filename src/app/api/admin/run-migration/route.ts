import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Secret token for migration - set in Vercel environment variables
const MIGRATION_TOKEN = process.env.MIGRATION_TOKEN;

// POST /api/admin/run-migration - Run pending schema migrations
export async function POST(request: NextRequest) {
  try {
    // Check for migration token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!MIGRATION_TOKEN) {
      return NextResponse.json(
        { error: "MIGRATION_TOKEN not configured on server" },
        { status: 500 }
      );
    }

    if (!token || token !== MIGRATION_TOKEN) {
      return NextResponse.json(
        { error: "Invalid or missing migration token" },
        { status: 401 }
      );
    }

    const results: string[] = [];

    // ============================================================
    // MIGRATION: Remove startDate and endDate from Campaign table
    // Campaigns are now "evergreen containers" - date attribution
    // uses Lead.createdAt matched against CampaignSpend.startDate/endDate
    // ============================================================

    // Step 1: Drop startDate column from Campaign
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "startDate";
      `);
      results.push("✅ Dropped Campaign.startDate column (or already removed)");
    } catch (e) {
      results.push(`⚠️ Drop startDate: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Step 2: Drop endDate column from Campaign
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "endDate";
      `);
      results.push("✅ Dropped Campaign.endDate column (or already removed)");
    } catch (e) {
      results.push(`⚠️ Drop endDate: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ============================================================
    // PREVIOUS MIGRATIONS (kept for idempotency)
    // ============================================================

    // Step 3: Create the MasterCampaignStatus enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "MasterCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✅ Created MasterCampaignStatus enum (or already exists)");
    } catch (e) {
      results.push(`⚠️ Enum creation: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Step 4: Add indexes on MasterCampaign
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MasterCampaign_courseId_idx" ON "MasterCampaign"("courseId");
      `);
      results.push("✅ Created index on MasterCampaign.courseId");
    } catch (e) {
      results.push(`⚠️ courseId index: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MasterCampaign_status_idx" ON "MasterCampaign"("status");
      `);
      results.push("✅ Created index on MasterCampaign.status");
    } catch (e) {
      results.push(`⚠️ status index: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Verify the current state
    const masterCampaignCount = await prisma.masterCampaign.count();
    const campaignCount = await prisma.campaign.count();

    return NextResponse.json({
      success: true,
      message: "Migration completed - Campaign.startDate/endDate removed",
      results,
      stats: {
        masterCampaigns: masterCampaignCount,
        campaigns: campaignCount,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { 
        error: "Migration failed", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!MIGRATION_TOKEN || !token || token !== MIGRATION_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check current schema state
    const checks: Record<string, unknown> = {};

    // Check if Campaign date columns exist
    try {
      const columnCheck = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Campaign' 
        AND column_name IN ('startDate', 'endDate');
      `;
      const existingColumns = columnCheck.map(c => c.column_name);
      checks.campaignDateColumns = {
        startDateExists: existingColumns.includes('startDate'),
        endDateExists: existingColumns.includes('endDate'),
        status: existingColumns.length === 0 ? 'REMOVED' : 'STILL_EXISTS'
      };
    } catch (e) {
      checks.campaignDateColumns = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Check if enum exists
    try {
      const enumCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'MasterCampaignStatus'
        ) as exists;
      `;
      checks.enumExists = enumCheck[0]?.exists ?? false;
    } catch {
      checks.enumExists = "error checking";
    }

    // Check indexes
    try {
      const indexCheck = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'MasterCampaign' 
        AND indexname LIKE '%courseId%' OR indexname LIKE '%status%';
      `;
      checks.indexes = indexCheck.map((i) => i.indexname);
    } catch {
      checks.indexes = "error checking";
    }

    // Get sample MasterCampaign to check status type
    try {
      const sample = await prisma.masterCampaign.findFirst({
        select: { id: true, status: true },
      });
      checks.sampleStatus = sample?.status ?? "no records";
    } catch (e) {
      checks.sampleStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Get campaign count
    const campaignCount = await prisma.campaign.count();
    const masterCampaignCount = await prisma.masterCampaign.count();

    return NextResponse.json({
      message: "Schema status check",
      checks,
      stats: {
        campaigns: campaignCount,
        masterCampaigns: masterCampaignCount,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
