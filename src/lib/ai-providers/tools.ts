/**
 * AI Tools for ReAct Pattern
 * 
 * These tools allow the AI to fetch specific CRM data as needed,
 * rather than receiving all data upfront.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============================================================================
// Tool Definitions (for AI function calling)
// ============================================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_lead_stats",
      description: "Get lead statistics with counts by status, platform, and conversion rates. Use for questions about lead volume, conversion rates, or lead distribution.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD). Example: '2026-01-01'"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD). Example: '2026-01-31'"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by advertising platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          commercialId: {
            type: "string",
            description: "Filter by commercial user ID (assigned to or contacted by) (optional)"
          },
          status: {
            type: "string",
            enum: ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO", "PERSO"],
            description: "Filter by lead status (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_spend_data",
      description: "Get advertising spend data with totals by platform and CPL (cost per lead). Use for questions about marketing costs, budget, or CPL.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          campaignId: {
            type: "string",
            description: "Filter by specific campaign ID (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional) - filters campaigns linked to this course"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_revenue_data",
      description: "Get revenue data from enrollments (iscritti). Calculates revenue as enrollments × course price. Use for ROI, revenue, or profitability questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_call_analytics",
      description: "Get call/contact analytics including call counts, outcomes, best contact times, and patterns. Use for questions about calling performance, contact rates, or when to call.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD)"
          },
          commercialId: {
            type: "string",
            description: "Filter by commercial user ID (optional)"
          },
          outcome: {
            type: "string",
            enum: ["POSITIVO", "RICHIAMARE", "NEGATIVO"],
            description: "Filter by call outcome (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by advertising platform (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_campaigns",
      description: "Get campaign list with performance metrics (leads, spend, CPL). Use for questions about specific campaigns or campaign comparisons.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          status: {
            type: "string",
            enum: ["ACTIVE", "PAUSED", "COMPLETED"],
            description: "Filter by campaign status (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          limit: {
            type: "number",
            description: "Maximum number of campaigns to return (default 10)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_commercials_performance",
      description: "Get performance metrics for commercial users (leads contacted, calls made, conversions). Use for questions about sales team performance.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date in ISO format (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date in ISO format (YYYY-MM-DD)"
          },
          commercialId: {
            type: "string",
            description: "Filter by specific commercial ID (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by advertising platform (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_trends",
      description: "Get historical trends comparing metrics across time periods (month-over-month, week-over-week). Use for growth analysis, trend questions, or comparisons over time.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["leads", "spend", "enrollments", "revenue", "cpl", "conversion_rate"],
            description: "The metric to track over time"
          },
          period: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Aggregation period"
          },
          months: {
            type: "number",
            description: "Number of months to look back (default 6)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          }
        },
        required: ["metric", "period"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_recent_leads",
      description: "Get individual lead records with details. Use for questions about specific leads or recent activity.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of leads to return (default 10, max 50)"
          },
          status: {
            type: "string",
            enum: ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO", "PERSO"],
            description: "Filter by status (optional)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          commercialId: {
            type: "string",
            description: "Filter by commercial user ID (assigned to or contacted by) (optional)"
          },
          sortBy: {
            type: "string",
            enum: ["createdAt", "contactedAt", "enrolledAt"],
            description: "Sort field (default createdAt)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_courses",
      description: "Get list of courses with prices and lead counts. Use for questions about course offerings or course performance.",
      parameters: {
        type: "object",
        properties: {
          activeOnly: {
            type: "boolean",
            description: "Only return active courses (default true)"
          },
          startDate: {
            type: "string",
            description: "Start date for lead counts (optional)"
          },
          endDate: {
            type: "string",
            description: "End date for lead counts (optional)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "Perform mathematical calculations. Use this for accurate math instead of mental calculations. Supports basic operations, percentages, averages, and growth rates.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["add", "subtract", "multiply", "divide", "percentage", "percentage_change", "average", "sum", "roi"],
            description: "The mathematical operation to perform"
          },
          values: {
            type: "array",
            items: { type: "number" },
            description: "Array of numbers to operate on"
          },
          label: {
            type: "string",
            description: "Optional label for the result (e.g., 'CPL', 'ROI', 'Conversion Rate')"
          }
        },
        required: ["operation", "values"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "compare_periods",
      description: "Compare metrics between two time periods. Returns the values for each period and calculates the change. Use for month-over-month, year-over-year, or any period comparison.",
      parameters: {
        type: "object",
        properties: {
          metric: {
            type: "string",
            enum: ["leads", "spend", "enrollments", "revenue", "cpl", "conversion_rate"],
            description: "The metric to compare"
          },
          period1Start: {
            type: "string",
            description: "Start date of first period (YYYY-MM-DD)"
          },
          period1End: {
            type: "string",
            description: "End date of first period (YYYY-MM-DD)"
          },
          period2Start: {
            type: "string",
            description: "Start date of second period (YYYY-MM-DD)"
          },
          period2End: {
            type: "string",
            description: "End date of second period (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          }
        },
        required: ["metric", "period1Start", "period1End", "period2Start", "period2End"]
      }
    }
  }
];

// ============================================================================
// Tool Executor - Runs the actual Prisma queries
// ============================================================================

export type ToolName = 
  | "get_lead_stats"
  | "get_spend_data"
  | "get_revenue_data"
  | "get_call_analytics"
  | "get_campaigns"
  | "get_commercials_performance"
  | "get_trends"
  | "get_recent_leads"
  | "get_courses"
  | "calculate"
  | "compare_periods";

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Execute a tool call and return the result
 */
export async function executeTool(name: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_lead_stats":
        return { success: true, data: await getLeadStats(args) };
      case "get_spend_data":
        return { success: true, data: await getSpendData(args) };
      case "get_revenue_data":
        return { success: true, data: await getRevenueData(args) };
      case "get_call_analytics":
        return { success: true, data: await getCallAnalytics(args) };
      case "get_campaigns":
        return { success: true, data: await getCampaigns(args) };
      case "get_commercials_performance":
        return { success: true, data: await getCommercialsPerformance(args) };
      case "get_trends":
        return { success: true, data: await getTrends(args) };
      case "get_recent_leads":
        return { success: true, data: await getRecentLeads(args) };
      case "get_courses":
        return { success: true, data: await getCourses(args) };
      case "calculate":
        return { success: true, data: calculate(args) };
      case "compare_periods":
        return { success: true, data: await comparePeriods(args) };
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Tool execution failed" 
    };
  }
}

// ============================================================================
// Individual Tool Implementations
// ============================================================================

async function getLeadStats(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const whereClause: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate }
  };

  if (args.status) {
    whereClause.status = args.status;
  }
  if (args.courseId) {
    whereClause.courseId = args.courseId;
  }

  // Get leads with campaign filter if platform specified
  let platformFilter = {};
  if (args.platform) {
    platformFilter = {
      campaign: { platform: args.platform }
    };
  }
  
  // Add commercial filter (assigned to OR contacted by)
  let commercialFilter = {};
  if (args.commercialId) {
    commercialFilter = {
      OR: [
        { assignedToId: args.commercialId },
        { contactedById: args.commercialId }
      ]
    };
  }

  // Build filters for raw query
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const commercialFilterSql = args.commercialId 
    ? Prisma.sql`AND (l."assignedToId" = ${args.commercialId as string} OR l."contactedById" = ${args.commercialId as string})` 
    : Prisma.empty;

  const [total, byStatus, byPlatform, enrolled] = await Promise.all([
    prisma.lead.count({ where: { ...whereClause, ...platformFilter, ...commercialFilter } }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: true,
      where: { ...whereClause, ...platformFilter, ...commercialFilter }
    }),
    prisma.$queryRaw`
      SELECT c.platform, COUNT(l.id)::int as count
      FROM "Lead" l
      JOIN "Campaign" c ON l."campaignId" = c.id
      WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
      ${platformFilterSql}
      ${commercialFilterSql}
      GROUP BY c.platform
      ORDER BY count DESC
    `,
    prisma.lead.count({ 
      where: { 
        ...whereClause, 
        ...platformFilter,
        ...commercialFilter,
        status: "ISCRITTO" 
      } 
    })
  ]);

  const conversionRate = total > 0 ? ((enrolled / total) * 100).toFixed(2) : "0";

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti",
      commerciale: args.commercialId || "tutti",
      stato: args.status || "tutti"
    },
    totaleLeads: total,
    perStato: byStatus.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>),
    perPiattaforma: byPlatform,
    iscritti: enrolled,
    tassoConversione: `${conversionRate}%`
  };
}

async function getSpendData(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  // Build filters for raw query
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND c."courseId" = ${args.courseId as string}` 
    : Prisma.empty;

  // Note: Spend records have startDate and optional endDate
  // We need to find records that OVERLAP with the query period, not just start within it
  // Overlap condition: spend.startDate <= queryEnd AND (spend.endDate >= queryStart OR spend.endDate IS NULL)
  const [spendByPlatform, leadsByPlatform, totalSpend] = await Promise.all([
    prisma.$queryRaw<{ platform: string; total_spend: number }[]>`
      SELECT c.platform, COALESCE(SUM(cs.amount), 0)::float as total_spend
      FROM "CampaignSpend" cs
      JOIN "Campaign" c ON cs."campaignId" = c.id
      WHERE cs."startDate" <= ${endDate} 
        AND (cs."endDate" >= ${startDate} OR cs."endDate" IS NULL)
      ${platformFilterSql}
      ${courseFilterSql}
      GROUP BY c.platform
      ORDER BY total_spend DESC
    `,
    prisma.$queryRaw<{ platform: string; count: number }[]>`
      SELECT c.platform, COUNT(l.id)::int as count
      FROM "Lead" l
      JOIN "Campaign" c ON l."campaignId" = c.id
      WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
      ${platformFilterSql}
      ${courseFilterSql}
      GROUP BY c.platform
    `,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(cs.amount), 0)::float as total
      FROM "CampaignSpend" cs
      JOIN "Campaign" c ON cs."campaignId" = c.id
      WHERE cs."startDate" <= ${endDate} 
        AND (cs."endDate" >= ${startDate} OR cs."endDate" IS NULL)
      ${platformFilterSql}
      ${courseFilterSql}
    `
  ]);

  // Calculate CPL per platform
  const leadMap = new Map<string, number>(leadsByPlatform.map(l => [l.platform, l.count]));
  const spendWithCPL = spendByPlatform.map(s => {
    const leads = leadMap.get(s.platform) || 0;
    return {
      piattaforma: s.platform,
      spesa: s.total_spend.toFixed(2),
      leads,
      cpl: leads > 0 ? (s.total_spend / leads).toFixed(2) : "N/A"
    };
  });

  const totalLeads = leadsByPlatform.reduce((sum, l) => sum + l.count, 0);
  const total = totalSpend[0]?.total || 0;

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: { 
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti"
    },
    spesaTotale: total.toFixed(2),
    leadsTotali: totalLeads,
    cplMedio: totalLeads > 0 ? (total / totalLeads).toFixed(2) : "N/A",
    perPiattaforma: spendWithCPL
  };
}

async function getRevenueData(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  // Build filters for raw query
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;

  // Get enrollments with course prices
  const enrollments = await prisma.$queryRaw<{ 
    platform: string; 
    course_name: string;
    course_price: number;
    enrollment_count: number;
    total_revenue: number;
  }[]>`
    SELECT 
      c.platform,
      co.name as course_name,
      co.price::float as course_price,
      COUNT(l.id)::int as enrollment_count,
      (COUNT(l.id) * co.price)::float as total_revenue
    FROM "Lead" l
    JOIN "Campaign" c ON l."campaignId" = c.id
    JOIN "Course" co ON l."courseId" = co.id
    WHERE l.status = 'ISCRITTO'
      AND l."enrolledAt" >= ${startDate} 
      AND l."enrolledAt" <= ${endDate}
      ${platformFilterSql}
      ${courseFilterSql}
    GROUP BY c.platform, co.name, co.price
    ORDER BY total_revenue DESC
  `;

  // Get spend for ROI calculation
  // Use overlap logic: spend period overlaps with query period
  const spendData = await prisma.$queryRaw<{ platform: string; total_spend: number }[]>`
    SELECT c.platform, COALESCE(SUM(cs.amount), 0)::float as total_spend
    FROM "CampaignSpend" cs
    JOIN "Campaign" c ON cs."campaignId" = c.id
    WHERE cs."startDate" <= ${endDate} 
      AND (cs."endDate" >= ${startDate} OR cs."endDate" IS NULL)
    ${platformFilterSql}
    GROUP BY c.platform
  `;

  const spendMap = new Map<string, number>(spendData.map(s => [s.platform, s.total_spend]));

  // Aggregate by platform
  const byPlatform = new Map<string, { revenue: number; enrollments: number; spend: number }>();
  for (const e of enrollments) {
    const existing = byPlatform.get(e.platform) || { revenue: 0, enrollments: 0, spend: 0 };
    existing.revenue += e.total_revenue;
    existing.enrollments += e.enrollment_count;
    existing.spend = spendMap.get(e.platform) || 0;
    byPlatform.set(e.platform, existing);
  }

  const platformData = Array.from(byPlatform.entries()).map(([platform, data]) => ({
    piattaforma: platform,
    iscrizioni: data.enrollments,
    ricavo: data.revenue.toFixed(2),
    spesa: data.spend.toFixed(2),
    roi: data.spend > 0 ? (((data.revenue - data.spend) / data.spend) * 100).toFixed(1) + "%" : "N/A"
  }));

  const totalRevenue = enrollments.reduce((sum, e) => sum + e.total_revenue, 0);
  const totalSpend = spendData.reduce((sum, s) => sum + s.total_spend, 0);
  const totalEnrollments = enrollments.reduce((sum, e) => sum + e.enrollment_count, 0);

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: { 
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti" 
    },
    ricavoTotale: totalRevenue.toFixed(2),
    spesaTotale: totalSpend.toFixed(2),
    profitto: (totalRevenue - totalSpend).toFixed(2),
    roi: totalSpend > 0 ? (((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(1) + "%" : "N/A",
    iscrizioniTotali: totalEnrollments,
    perPiattaforma: platformData,
    dettaglioCorsi: enrollments.map(e => ({
      piattaforma: e.platform,
      corso: e.course_name,
      prezzoCorso: e.course_price.toFixed(2),
      iscrizioni: e.enrollment_count,
      ricavo: e.total_revenue.toFixed(2)
    }))
  };
}

async function getCallAnalytics(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  // Build filters for raw query
  const commercialFilterActivitySql = args.commercialId 
    ? Prisma.sql`AND la."userId" = ${args.commercialId as string}` 
    : Prisma.empty;
  const outcomeFilterSql = args.outcome 
    ? Prisma.sql`AND l."callOutcome" = ${args.outcome as string}` 
    : Prisma.empty;
  const commercialFilterLeadSql = args.commercialId 
    ? Prisma.sql`AND l."contactedById" = ${args.commercialId as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  // Platform requires campaign join
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  // Get call data from LeadActivity (type = CALL)
  const callData = await prisma.$queryRaw<{
    outcome: string;
    count: number;
    hour: number;
    day_of_week: number;
  }[]>`
    SELECT 
      l."callOutcome" as outcome,
      COUNT(la.id)::int as count,
      EXTRACT(HOUR FROM la."createdAt")::int as hour,
      EXTRACT(DOW FROM la."createdAt")::int as day_of_week
    FROM "LeadActivity" la
    JOIN "Lead" l ON la."leadId" = l.id
    ${platformJoinSql}
    WHERE la.type = 'CALL'
      AND la."createdAt" >= ${startDate} AND la."createdAt" <= ${endDate}
      ${commercialFilterActivitySql}
      ${outcomeFilterSql}
      ${courseFilterSql}
      ${platformFilterSql}
    GROUP BY l."callOutcome", EXTRACT(HOUR FROM la."createdAt"), EXTRACT(DOW FROM la."createdAt")
  `;

  // Also get summary from Lead table for outcomes
  const outcomeSummary = await prisma.$queryRaw<{ outcome: string; count: number }[]>`
    SELECT l."callOutcome" as outcome, COUNT(*)::int as count
    FROM "Lead" l
    ${platformJoinSql}
    WHERE l."callOutcome" IS NOT NULL
      AND l."lastAttemptAt" >= ${startDate} AND l."lastAttemptAt" <= ${endDate}
      ${commercialFilterLeadSql}
      ${courseFilterSql}
      ${platformFilterSql}
    GROUP BY l."callOutcome"
  `;

  // Aggregate by outcome
  const byOutcome: Record<string, number> = {};
  for (const o of outcomeSummary) {
    if (o.outcome) byOutcome[o.outcome] = o.count;
  }

  const byHour: Record<number, { total: number; positive: number }> = {};
  const byDayOfWeek: Record<number, { total: number; positive: number }> = {};
  
  for (const c of callData) {
    if (!byHour[c.hour]) byHour[c.hour] = { total: 0, positive: 0 };
    byHour[c.hour].total += c.count;
    if (c.outcome === "POSITIVO") byHour[c.hour].positive += c.count;
    
    if (!byDayOfWeek[c.day_of_week]) byDayOfWeek[c.day_of_week] = { total: 0, positive: 0 };
    byDayOfWeek[c.day_of_week].total += c.count;
    if (c.outcome === "POSITIVO") byDayOfWeek[c.day_of_week].positive += c.count;
  }

  // Find best times
  const hourStats = Object.entries(byHour).map(([hour, data]) => ({
    ora: parseInt(hour),
    chiamate: data.total,
    positive: data.positive,
    tassoSuccesso: data.total > 0 ? ((data.positive / data.total) * 100).toFixed(1) + "%" : "0%"
  })).sort((a, b) => b.positive - a.positive);

  const dayNames = ["Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato"];
  const dayStats = Object.entries(byDayOfWeek).map(([day, data]) => ({
    giorno: dayNames[parseInt(day)],
    chiamate: data.total,
    positive: data.positive,
    tassoSuccesso: data.total > 0 ? ((data.positive / data.total) * 100).toFixed(1) + "%" : "0%"
  })).sort((a, b) => b.positive - a.positive);

  const totalCalls = Object.values(byOutcome).reduce((sum, c) => sum + c, 0);

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      commerciale: args.commercialId || "tutti",
      esito: args.outcome || "tutti",
      corso: args.courseId || "tutti",
      piattaforma: args.platform || "tutte"
    },
    chiamateTotali: totalCalls,
    perEsito: byOutcome,
    tassoSuccesso: totalCalls > 0 ? (((byOutcome["POSITIVO"] || 0) / totalCalls) * 100).toFixed(1) + "%" : "0%",
    miglioriOre: hourStats.slice(0, 5),
    miglioriGiorni: dayStats,
    consigli: [
      hourStats[0] ? `L'ora migliore per chiamare e alle ${hourStats[0].ora}:00 (${hourStats[0].tassoSuccesso} successo)` : null,
      dayStats[0] ? `Il giorno migliore e ${dayStats[0].giorno} (${dayStats[0].tassoSuccesso} successo)` : null
    ].filter(Boolean)
  };
}

async function getCampaigns(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);
  const limit = Math.min((args.limit as number) || 10, 50);

  // Build filters for raw query
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const statusFilterSql = args.status 
    ? Prisma.sql`AND c.status = ${args.status as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND c."courseId" = ${args.courseId as string}` 
    : Prisma.empty;

  const campaigns = await prisma.$queryRaw<{
    id: string;
    name: string;
    platform: string;
    status: string;
    leads: number;
    spend: number;
  }[]>`
    SELECT 
      c.id,
      c.name,
      c.platform,
      c.status,
      COUNT(DISTINCT l.id)::int as leads,
      COALESCE(SUM(cs.amount), 0)::float as spend
    FROM "Campaign" c
    LEFT JOIN "Lead" l ON l."campaignId" = c.id 
      AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
    LEFT JOIN "CampaignSpend" cs ON cs."campaignId" = c.id
      AND cs."startDate" <= ${endDate} 
      AND (cs."endDate" >= ${startDate} OR cs."endDate" IS NULL)
    WHERE 1=1
      ${platformFilterSql}
      ${statusFilterSql}
      ${courseFilterSql}
    GROUP BY c.id, c.name, c.platform, c.status
    ORDER BY spend DESC
    LIMIT ${limit}
  `;

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      piattaforma: args.platform || "tutte",
      stato: args.status || "tutti",
      corso: args.courseId || "tutti"
    },
    campagne: campaigns.map(c => ({
      id: c.id,
      nome: c.name,
      piattaforma: c.platform,
      stato: c.status,
      leads: c.leads,
      spesa: c.spend.toFixed(2),
      cpl: c.leads > 0 ? (c.spend / c.leads).toFixed(2) : "N/A"
    }))
  };
}

async function getCommercialsPerformance(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  // Build filters for raw query
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;
  const commercialFilterSql = args.commercialId 
    ? Prisma.sql`AND u.id = ${args.commercialId as string}` 
    : Prisma.empty;

  // Use raw query to support all filters
  const commercials = await prisma.$queryRaw<{
    id: string;
    name: string;
    email: string;
    contacted: number;
    enrolled: number;
  }[]>`
    SELECT 
      u.id,
      u.name,
      u.email,
      COUNT(DISTINCT CASE WHEN l."contactedAt" >= ${startDate} AND l."contactedAt" <= ${endDate} THEN l.id END)::int as contacted,
      COUNT(DISTINCT CASE WHEN l.status = 'ISCRITTO' AND l."enrolledAt" >= ${startDate} AND l."enrolledAt" <= ${endDate} THEN l.id END)::int as enrolled
    FROM "User" u
    LEFT JOIN "Lead" l ON l."contactedById" = u.id
    ${platformJoinSql}
    WHERE u.role = 'COMMERCIAL'
      ${commercialFilterSql}
      ${courseFilterSql}
      ${platformFilterSql}
    GROUP BY u.id, u.name, u.email
  `;

  // Get call counts per commercial from LeadActivity (with filters)
  const callActivityCourseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const callActivityPlatformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const callActivityPlatformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;
  
  const callCounts = await prisma.$queryRaw<{ userId: string; calls: number }[]>`
    SELECT la."userId", COUNT(*)::int as calls
    FROM "LeadActivity" la
    JOIN "Lead" l ON la."leadId" = l.id
    ${callActivityPlatformJoinSql}
    WHERE la.type = 'CALL'
      AND la."createdAt" >= ${startDate} AND la."createdAt" <= ${endDate}
      ${callActivityCourseFilterSql}
      ${callActivityPlatformFilterSql}
    GROUP BY la."userId"
  `;

  const callMap = new Map<string, number>(callCounts.map(c => [c.userId, c.calls]));

  const performance = commercials.map(c => {
    const contacted = c.contacted;
    const enrolled = c.enrolled;
    const calls = callMap.get(c.id) || 0;
    
    return {
      id: c.id,
      nome: c.name,
      email: c.email,
      leadContattati: contacted,
      chiamateEffettuate: calls,
      iscrizioni: enrolled,
      tassoConversione: contacted > 0 ? ((enrolled / contacted) * 100).toFixed(1) + "%" : "0%",
      chiamatePerIscrizione: enrolled > 0 ? (calls / enrolled).toFixed(1) : "N/A"
    };
  }).sort((a, b) => b.iscrizioni - a.iscrizioni);

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      commerciale: args.commercialId || "tutti",
      corso: args.courseId || "tutti",
      piattaforma: args.platform || "tutte"
    },
    commerciali: performance,
    riepilogo: {
      totaleContattati: performance.reduce((sum, c) => sum + c.leadContattati, 0),
      totaleChiamate: performance.reduce((sum, c) => sum + c.chiamateEffettuate, 0),
      totaleIscrizioni: performance.reduce((sum, c) => sum + c.iscrizioni, 0)
    }
  };
}

async function getTrends(args: Record<string, unknown>) {
  const months = (args.months as number) || 6;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const metric = args.metric as string;
  const period = args.period as string;

  let dateFormat: string;
  switch (period) {
    case "daily":
      dateFormat = "YYYY-MM-DD";
      break;
    case "weekly":
      dateFormat = "IYYY-IW"; // ISO week
      break;
    case "monthly":
    default:
      dateFormat = "YYYY-MM";
  }

  // Build platform join for raw query
  const platformJoinLeadSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const platformJoinSpendSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON cs."campaignId" = c.id AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const platformJoinRevenueSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  
  // Build course filter
  const courseFilterLeadSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const courseFilterSpendSql = args.courseId 
    ? Prisma.sql`AND c."courseId" = ${args.courseId as string}` 
    : Prisma.empty;

  let query;
  switch (metric) {
    case "leads":
      query = prisma.$queryRaw<{ period: string; value: number }[]>`
        SELECT TO_CHAR(l."createdAt", ${dateFormat}) as period, COUNT(*)::int as value
        FROM "Lead" l
        ${platformJoinLeadSql}
        WHERE l."createdAt" >= ${startDate}
        ${courseFilterLeadSql}
        GROUP BY TO_CHAR(l."createdAt", ${dateFormat})
        ORDER BY period
      `;
      break;
    case "enrollments":
      query = prisma.$queryRaw<{ period: string; value: number }[]>`
        SELECT TO_CHAR(l."enrolledAt", ${dateFormat}) as period, COUNT(*)::int as value
        FROM "Lead" l
        ${platformJoinLeadSql}
        WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${startDate}
        ${courseFilterLeadSql}
        GROUP BY TO_CHAR(l."enrolledAt", ${dateFormat})
        ORDER BY period
      `;
      break;
    case "spend":
      // For spend, courseId filter requires campaign join - create joined version if needed
      const spendPlatformOrCourseJoinSql = (args.platform || args.courseId)
        ? Prisma.sql`JOIN "Campaign" c ON cs."campaignId" = c.id`
        : Prisma.empty;
      const spendPlatformFilterSql = args.platform 
        ? Prisma.sql`AND c.platform = ${args.platform as string}` 
        : Prisma.empty;
      query = prisma.$queryRaw<{ period: string; value: number }[]>`
        SELECT TO_CHAR(cs."startDate", ${dateFormat}) as period, COALESCE(SUM(cs.amount), 0)::float as value
        FROM "CampaignSpend" cs
        ${spendPlatformOrCourseJoinSql}
        WHERE cs."startDate" >= ${startDate}
        ${spendPlatformFilterSql}
        ${courseFilterSpendSql}
        GROUP BY TO_CHAR(cs."startDate", ${dateFormat})
        ORDER BY period
      `;
      break;
    case "revenue":
      query = prisma.$queryRaw<{ period: string; value: number }[]>`
        SELECT TO_CHAR(l."enrolledAt", ${dateFormat}) as period, COALESCE(SUM(co.price), 0)::float as value
        FROM "Lead" l
        JOIN "Course" co ON l."courseId" = co.id
        ${platformJoinRevenueSql}
        WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${startDate}
        ${courseFilterLeadSql}
        GROUP BY TO_CHAR(l."enrolledAt", ${dateFormat})
        ORDER BY period
      `;
      break;
    default:
      return { error: `Metric '${metric}' not yet implemented for trends` };
  }

  const data = await query;

  // Calculate growth rates
  const withGrowth = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].value : null;
    const growth = prev && prev > 0 ? (((d.value - prev) / prev) * 100).toFixed(1) + "%" : null;
    return {
      periodo: d.period,
      valore: typeof d.value === 'number' ? (Number.isInteger(d.value) ? d.value : d.value.toFixed(2)) : d.value,
      crescita: growth
    };
  });

  return {
    metrica: metric,
    aggregazione: period,
    mesiAnalizzati: months,
    filtri: { 
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti"
    },
    dati: withGrowth,
    riepilogo: {
      primo: withGrowth[0]?.valore || 0,
      ultimo: withGrowth[withGrowth.length - 1]?.valore || 0,
      crescitaTotale: withGrowth.length > 1 && data[0].value > 0
        ? (((data[data.length - 1].value - data[0].value) / data[0].value) * 100).toFixed(1) + "%"
        : "N/A"
    }
  };
}

async function getRecentLeads(args: Record<string, unknown>) {
  const limit = Math.min((args.limit as number) || 10, 50);
  const sortBy = (args.sortBy as string) || "createdAt";

  // Import Platform and LeadStatus types for proper typing
  type LeadStatusType = "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO";
  type PlatformType = "META" | "GOOGLE_ADS" | "LINKEDIN" | "TIKTOK";

  const whereClause: {
    status?: LeadStatusType;
    courseId?: string;
    campaign?: { platform: PlatformType };
    OR?: Array<{ assignedToId?: string; contactedById?: string }>;
  } = {};

  if (args.status) {
    whereClause.status = args.status as LeadStatusType;
  }
  if (args.courseId) {
    whereClause.courseId = args.courseId as string;
  }
  if (args.platform) {
    whereClause.campaign = { platform: args.platform as PlatformType };
  }
  if (args.commercialId) {
    // Filter by assigned to OR contacted by this commercial
    whereClause.OR = [
      { assignedToId: args.commercialId as string },
      { contactedById: args.commercialId as string }
    ];
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      course: { select: { name: true } },
      campaign: { select: { name: true, platform: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { [sortBy]: "desc" },
    take: limit
  });

  return {
    filtri: {
      stato: args.status || "tutti",
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti",
      commerciale: args.commercialId || "tutti"
    },
    leads: leads.map(l => ({
      id: l.id,
      nome: l.name,
      email: l.email,
      telefono: l.phone,
      stato: l.status,
      corso: l.course?.name || "N/A",
      campagna: l.campaign?.name || "N/A",
      piattaforma: l.campaign?.platform || "N/A",
      assegnatoA: l.assignedTo?.name || "Non assegnato",
      creato: l.createdAt.toISOString().split('T')[0],
      contattato: l.contactedAt?.toISOString().split('T')[0] || null,
      iscritto: l.enrolledAt?.toISOString().split('T')[0] || null
    }))
  };
}

async function getCourses(args: Record<string, unknown>) {
  const activeOnly = args.activeOnly !== false;
  
  // Build the select clause based on whether we have a date filter
  let countSelect: { leads: boolean | { where: { createdAt: { gte: Date; lte: Date } } } } = {
    leads: true
  };

  if (args.startDate && args.endDate) {
    const startDate = new Date(args.startDate as string);
    const endDate = new Date(args.endDate as string);
    endDate.setHours(23, 59, 59, 999);
    countSelect = {
      leads: {
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }
    };
  }

  const courses = await prisma.course.findMany({
    where: activeOnly ? { active: true } : {},
    select: {
      id: true,
      name: true,
      price: true,
      active: true,
      _count: {
        select: countSelect
      }
    },
    orderBy: { name: "asc" }
  });

  return {
    filtri: { soloAttivi: activeOnly },
    corsi: courses.map(c => ({
      id: c.id,
      nome: c.name,
      prezzo: c.price.toString(),
      attivo: c.active,
      leads: c._count.leads
    }))
  };
}

// ============================================================================
// Calculate Tool - Accurate Math Operations
// ============================================================================

function calculate(args: Record<string, unknown>) {
  const operation = args.operation as string;
  const values = args.values as number[];
  const label = args.label as string | undefined;

  if (!values || values.length === 0) {
    return { error: "No values provided for calculation" };
  }

  let result: number;
  let explanation: string;

  switch (operation) {
    case "add":
    case "sum":
      result = values.reduce((a, b) => a + b, 0);
      explanation = `${values.join(" + ")} = ${result}`;
      break;
    case "subtract":
      result = values.reduce((a, b) => a - b);
      explanation = `${values.join(" - ")} = ${result}`;
      break;
    case "multiply":
      result = values.reduce((a, b) => a * b, 1);
      explanation = `${values.join(" × ")} = ${result}`;
      break;
    case "divide":
      if (values.length < 2) return { error: "Division requires at least 2 values" };
      if (values[1] === 0) return { error: "Cannot divide by zero" };
      result = values[0] / values[1];
      explanation = `${values[0]} ÷ ${values[1]} = ${result}`;
      break;
    case "percentage":
      // Calculate what percentage value[0] is of value[1]
      if (values.length < 2) return { error: "Percentage requires 2 values: [part, whole]" };
      if (values[1] === 0) return { error: "Cannot calculate percentage of zero" };
      result = (values[0] / values[1]) * 100;
      explanation = `(${values[0]} / ${values[1]}) × 100 = ${result.toFixed(2)}%`;
      break;
    case "percentage_change":
      // Calculate percentage change from value[0] to value[1]
      if (values.length < 2) return { error: "Percentage change requires 2 values: [old, new]" };
      if (values[0] === 0) return { error: "Cannot calculate percentage change from zero" };
      result = ((values[1] - values[0]) / values[0]) * 100;
      explanation = `((${values[1]} - ${values[0]}) / ${values[0]}) × 100 = ${result.toFixed(2)}%`;
      break;
    case "average":
      result = values.reduce((a, b) => a + b, 0) / values.length;
      explanation = `(${values.join(" + ")}) / ${values.length} = ${result}`;
      break;
    case "roi":
      // ROI = ((revenue - cost) / cost) × 100
      if (values.length < 2) return { error: "ROI requires 2 values: [revenue, cost]" };
      if (values[1] === 0) return { error: "Cannot calculate ROI with zero cost" };
      const revenue = values[0];
      const cost = values[1];
      result = ((revenue - cost) / cost) * 100;
      explanation = `((${revenue} - ${cost}) / ${cost}) × 100 = ${result.toFixed(2)}%`;
      break;
    default:
      return { error: `Unknown operation: ${operation}` };
  }

  // Format result based on whether it's a percentage or not
  const isPercentage = ["percentage", "percentage_change", "roi"].includes(operation);
  const formattedResult = isPercentage 
    ? `${result.toFixed(2)}%` 
    : (Number.isInteger(result) ? result : result.toFixed(2));

  return {
    operazione: operation,
    valori: values,
    risultato: formattedResult,
    risultatoNumerico: result,
    spiegazione: explanation,
    etichetta: label || null
  };
}

// ============================================================================
// Compare Periods Tool - Period-over-Period Comparison
// ============================================================================

async function comparePeriods(args: Record<string, unknown>) {
  const metric = args.metric as string;
  const period1Start = new Date(args.period1Start as string);
  const period1End = new Date(args.period1End as string);
  const period2Start = new Date(args.period2Start as string);
  const period2End = new Date(args.period2End as string);
  
  period1End.setHours(23, 59, 59, 999);
  period2End.setHours(23, 59, 59, 999);

  // Build filters
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  let value1: number;
  let value2: number;

  switch (metric) {
    case "leads":
      [{ count: value1 }, { count: value2 }] = await Promise.all([
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period1Start} AND l."createdAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period2Start} AND l."createdAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0])
      ]);
      break;
    case "enrollments":
      [{ count: value1 }, { count: value2 }] = await Promise.all([
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${period1Start} AND l."enrolledAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${period2Start} AND l."enrolledAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0])
      ]);
      break;
    case "spend":
      const spendPlatformJoinSql = args.platform 
        ? Prisma.sql`JOIN "Campaign" c ON cs."campaignId" = c.id` 
        : Prisma.empty;
      const spendCourseFilterSql = args.courseId 
        ? Prisma.sql`AND c."courseId" = ${args.courseId as string}` 
        : Prisma.empty;
      [{ total: value1 }, { total: value2 }] = await Promise.all([
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(cs.amount), 0)::float as total FROM "CampaignSpend" cs
          ${spendPlatformJoinSql}
          WHERE cs."startDate" <= ${period1End} AND (cs."endDate" >= ${period1Start} OR cs."endDate" IS NULL)
          ${platformFilterSql} ${spendCourseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(cs.amount), 0)::float as total FROM "CampaignSpend" cs
          ${spendPlatformJoinSql}
          WHERE cs."startDate" <= ${period2End} AND (cs."endDate" >= ${period2Start} OR cs."endDate" IS NULL)
          ${platformFilterSql} ${spendCourseFilterSql}
        `.then(r => r[0])
      ]);
      break;
    case "revenue":
      [{ total: value1 }, { total: value2 }] = await Promise.all([
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(co.price), 0)::float as total FROM "Lead" l
          JOIN "Course" co ON l."courseId" = co.id
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${period1Start} AND l."enrolledAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(co.price), 0)::float as total FROM "Lead" l
          JOIN "Course" co ON l."courseId" = co.id
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."enrolledAt" >= ${period2Start} AND l."enrolledAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0])
      ]);
      break;
    case "cpl":
      // Get spend and leads for both periods, then calculate CPL
      const [spend1Data, leads1Data, spend2Data, leads2Data] = await Promise.all([
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(cs.amount), 0)::float as total FROM "CampaignSpend" cs
          ${args.platform ? Prisma.sql`JOIN "Campaign" c ON cs."campaignId" = c.id` : Prisma.empty}
          WHERE cs."startDate" <= ${period1End} AND (cs."endDate" >= ${period1Start} OR cs."endDate" IS NULL)
          ${platformFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period1Start} AND l."createdAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ total: number }]>`
          SELECT COALESCE(SUM(cs.amount), 0)::float as total FROM "CampaignSpend" cs
          ${args.platform ? Prisma.sql`JOIN "Campaign" c ON cs."campaignId" = c.id` : Prisma.empty}
          WHERE cs."startDate" <= ${period2End} AND (cs."endDate" >= ${period2Start} OR cs."endDate" IS NULL)
          ${platformFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period2Start} AND l."createdAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0])
      ]);
      value1 = leads1Data.count > 0 ? spend1Data.total / leads1Data.count : 0;
      value2 = leads2Data.count > 0 ? spend2Data.total / leads2Data.count : 0;
      break;
    case "conversion_rate":
      // Get leads and enrollments for both periods
      const [total1, enrolled1, total2, enrolled2] = await Promise.all([
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period1Start} AND l."createdAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."createdAt" >= ${period1Start} AND l."createdAt" <= ${period1End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l."createdAt" >= ${period2Start} AND l."createdAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0]),
        prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Lead" l
          ${platformJoinSql}
          WHERE l.status = 'ISCRITTO' AND l."createdAt" >= ${period2Start} AND l."createdAt" <= ${period2End}
          ${platformFilterSql} ${courseFilterSql}
        `.then(r => r[0])
      ]);
      value1 = total1.count > 0 ? (enrolled1.count / total1.count) * 100 : 0;
      value2 = total2.count > 0 ? (enrolled2.count / total2.count) * 100 : 0;
      break;
    default:
      return { error: `Metric '${metric}' not supported for comparison` };
  }

  // Calculate change
  const absoluteChange = value2 - value1;
  const percentChange = value1 > 0 ? ((value2 - value1) / value1) * 100 : (value2 > 0 ? 100 : 0);
  const direction = absoluteChange > 0 ? "aumento" : absoluteChange < 0 ? "diminuzione" : "invariato";

  // Format values based on metric type
  const isPercentMetric = ["conversion_rate"].includes(metric);
  const isCurrencyMetric = ["spend", "revenue", "cpl"].includes(metric);
  
  const formatValue = (v: number) => {
    if (isPercentMetric) return `${v.toFixed(2)}%`;
    if (isCurrencyMetric) return `€${v.toFixed(2)}`;
    return Number.isInteger(v) ? v : v.toFixed(2);
  };

  return {
    metrica: metric,
    periodo1: {
      inizio: period1Start.toISOString().split('T')[0],
      fine: period1End.toISOString().split('T')[0],
      valore: formatValue(value1),
      valoreNumerico: value1
    },
    periodo2: {
      inizio: period2Start.toISOString().split('T')[0],
      fine: period2End.toISOString().split('T')[0],
      valore: formatValue(value2),
      valoreNumerico: value2
    },
    confronto: {
      variazioneAssoluta: formatValue(absoluteChange),
      variazionePercentuale: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`,
      direzione: direction
    },
    filtri: {
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti"
    }
  };
}
