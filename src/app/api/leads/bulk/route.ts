import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type BulkAction = "assign" | "status" | "delete" | "set_cost" | "distribute_cost" | "distribute_by_period";

interface Distribution {
  leadId: string;
  cost: number;
}

interface BulkRequestBody {
  action: BulkAction;
  leadIds: string[];
  data?: {
    assignedToId?: string;
    distribute?: boolean;
    status?: string;
    acquisitionCost?: number;      // For set_cost action
    totalBudget?: number;          // For distribute_cost action
    campaignId?: string;           // For distribute_cost action
    distributions?: Distribution[]; // For distribute_by_period action
  };
}

// POST /api/leads/bulk - Perform bulk operations on leads
export async function POST(request: NextRequest) {
  try {
    const body: BulkRequestBody = await request.json();
    const { action, leadIds, data } = body;

    if (!leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { error: "No lead IDs provided" },
        { status: 400 }
      );
    }

    let successCount = 0;
    const errors: { leadId: string; error: string }[] = [];

    switch (action) {
      case "assign": {
        if (data?.distribute) {
          // Round-robin distribution
          const commercials = await prisma.user.findMany({
            where: { role: "COMMERCIAL" },
            select: { id: true, name: true },
          });

          if (commercials.length === 0) {
            return NextResponse.json(
              { error: "No commercials available for assignment" },
              { status: 400 }
            );
          }

          // Distribute leads evenly
          const assignments: { leadId: string; commercialId: string }[] = [];
          leadIds.forEach((leadId, index) => {
            const commercial = commercials[index % commercials.length];
            assignments.push({ leadId, commercialId: commercial.id });
          });

          // Update leads in bulk
          for (const assignment of assignments) {
            try {
              await prisma.lead.update({
                where: { id: assignment.leadId },
                data: { assignedToId: assignment.commercialId },
              });
              successCount++;
            } catch (error) {
              errors.push({
                leadId: assignment.leadId,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        } else if (data?.assignedToId) {
          // Single assignment
          try {
            await prisma.lead.updateMany({
              where: { id: { in: leadIds } },
              data: { assignedToId: data.assignedToId },
            });
            successCount = leadIds.length;
          } catch (error) {
            return NextResponse.json(
              { error: error instanceof Error ? error.message : "Failed to assign leads" },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Missing assignment data" },
            { status: 400 }
          );
        }
        break;
      }

      case "status": {
        if (!data?.status) {
          return NextResponse.json(
            { error: "Missing status value" },
            { status: 400 }
          );
        }

        // Validate status value
        const validStatuses = ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO", "PERSO"];
        if (!validStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: "Invalid status value" },
            { status: 400 }
          );
        }

        try {
          const result = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { status: data.status as "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO" },
          });
          successCount = result.count;
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update status" },
            { status: 500 }
          );
        }
        break;
      }

      case "delete": {
        try {
          const result = await prisma.lead.deleteMany({
            where: { id: { in: leadIds } },
          });
          successCount = result.count;
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete leads" },
            { status: 500 }
          );
        }
        break;
      }

      case "set_cost": {
        // Set the same acquisitionCost for all selected leads
        if (data?.acquisitionCost === undefined || data.acquisitionCost === null) {
          return NextResponse.json(
            { error: "Missing acquisitionCost value" },
            { status: 400 }
          );
        }

        try {
          const result = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { acquisitionCost: data.acquisitionCost },
          });
          successCount = result.count;
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to set acquisition cost" },
            { status: 500 }
          );
        }
        break;
      }

      case "distribute_cost": {
        // Distribute a total budget evenly across selected leads
        if (!data?.totalBudget || data.totalBudget <= 0) {
          return NextResponse.json(
            { error: "Missing or invalid totalBudget value" },
            { status: 400 }
          );
        }

        const costPerLead = data.totalBudget / leadIds.length;

        try {
          const result = await prisma.lead.updateMany({
            where: { id: { in: leadIds } },
            data: { acquisitionCost: costPerLead },
          });
          successCount = result.count;
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to distribute cost" },
            { status: 500 }
          );
        }
        break;
      }

      case "distribute_by_period": {
        // Distribute costs with individual amounts per lead (for period-wise distribution)
        if (!data?.distributions || data.distributions.length === 0) {
          return NextResponse.json(
            { error: "Missing distributions array" },
            { status: 400 }
          );
        }

        // Update each lead with its specific cost
        for (const dist of data.distributions) {
          try {
            await prisma.lead.update({
              where: { id: dist.leadId },
              data: { acquisitionCost: dist.cost },
            });
            successCount++;
          } catch (error) {
            errors.push({
              leadId: dist.leadId,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      successCount,
      totalRequested: leadIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk operation failed:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}
