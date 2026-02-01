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
  },
  // ============================================================================
  // USER & TEAM TOOLS
  // ============================================================================
  {
    type: "function" as const,
    function: {
      name: "get_users",
      description: "Get list of users (commercials, admins, marketing staff). Use for questions about team members or to find user IDs for other tools.",
      parameters: {
        type: "object",
        properties: {
          role: {
            type: "string",
            enum: ["ADMIN", "COMMERCIAL", "MARKETING"],
            description: "Filter by role (optional)"
          },
          includeStats: {
            type: "boolean",
            description: "Include basic stats like lead count (default false, slower)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_goals",
      description: "Get monthly goals and progress for commercials. Use for questions about targets, quotas, or performance vs goals.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "Filter by user ID (optional)"
          },
          month: {
            type: "number",
            description: "Month (1-12). Default: current month"
          },
          year: {
            type: "number",
            description: "Year. Default: current year"
          },
          includeProgress: {
            type: "boolean",
            description: "Include actual progress vs goals (default true)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tasks",
      description: "Get tasks for commercials. Use for questions about pending work, follow-ups, or task completion.",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "Filter by user ID (optional)"
          },
          completed: {
            type: "boolean",
            description: "Filter by completion status (optional)"
          },
          priority: {
            type: "string",
            enum: ["HIGH", "MEDIUM", "LOW"],
            description: "Filter by priority (optional)"
          },
          dueBefore: {
            type: "string",
            description: "Filter tasks due before this date (YYYY-MM-DD)"
          },
          limit: {
            type: "number",
            description: "Maximum tasks to return (default 20)"
          }
        }
      }
    }
  },
  // ============================================================================
  // ADVANCED ANALYSIS TOOLS
  // ============================================================================
  {
    type: "function" as const,
    function: {
      name: "get_funnel_analysis",
      description: "Get complete sales funnel analysis from NUOVO to ISCRITTO. Shows conversion rates between each stage. Use for funnel optimization questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
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
            description: "Filter by commercial (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_platform_comparison",
      description: "Compare all platforms head-to-head on key metrics. Use for deciding where to allocate budget or comparing platform effectiveness.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          courseId: {
            type: "string",
            description: "Filter by course ID (optional)"
          },
          metrics: {
            type: "array",
            items: { type: "string" },
            description: "Metrics to compare: leads, spend, cpl, enrollments, conversion_rate, revenue, roi (default: all)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_lead_quality_analysis",
      description: "Analyze lead quality by source, platform, or campaign. Measures quality by conversion rate, time to convert, and engagement. Use for source quality questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          groupBy: {
            type: "string",
            enum: ["platform", "campaign", "course", "source"],
            description: "How to group the analysis (default: platform)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_response_time_analysis",
      description: "Analyze time from lead creation to first contact. Faster response = better conversion. Use for efficiency questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          commercialId: {
            type: "string",
            description: "Filter by commercial (optional)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_enrollment_timeline",
      description: "Analyze how long it takes to convert leads to enrollments. Shows distribution of days from creation to enrollment. Use for sales cycle questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_daily_activity",
      description: "Get day-by-day activity breakdown. Shows leads created, calls made, enrollments per day. Use for daily performance tracking.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          commercialId: {
            type: "string",
            description: "Filter by commercial (optional)"
          },
          activityTypes: {
            type: "array",
            items: { type: "string" },
            description: "Activity types to include: leads, calls, enrollments, contacts (default: all)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_lost_leads_analysis",
      description: "Analyze lost leads (PERSO status) - why were they lost, after how many attempts, from which sources. Use for improving conversion.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "Start date (YYYY-MM-DD)"
          },
          endDate: {
            type: "string",
            description: "End date (YYYY-MM-DD)"
          },
          platform: {
            type: "string",
            enum: ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"],
            description: "Filter by platform (optional)"
          },
          courseId: {
            type: "string",
            description: "Filter by course (optional)"
          }
        },
        required: ["startDate", "endDate"]
      }
    }
  },
  // ============================================================================
  // ADVANCED MATH TOOLS
  // ============================================================================
  {
    type: "function" as const,
    function: {
      name: "calculate_cpl",
      description: "Calculate Cost Per Lead. Divides total spend by total leads. Use for quick CPL calculations.",
      parameters: {
        type: "object",
        properties: {
          spend: {
            type: "number",
            description: "Total advertising spend"
          },
          leads: {
            type: "number",
            description: "Total number of leads"
          }
        },
        required: ["spend", "leads"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_conversion_rate",
      description: "Calculate conversion rate between any two numbers. Use for custom conversion calculations.",
      parameters: {
        type: "object",
        properties: {
          converted: {
            type: "number",
            description: "Number of conversions (numerator)"
          },
          total: {
            type: "number",
            description: "Total attempts (denominator)"
          },
          label: {
            type: "string",
            description: "Optional label for the result"
          }
        },
        required: ["converted", "total"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_growth_rate",
      description: "Calculate growth rate between two periods. Returns percentage increase or decrease.",
      parameters: {
        type: "object",
        properties: {
          previousValue: {
            type: "number",
            description: "Value from previous period"
          },
          currentValue: {
            type: "number",
            description: "Value from current period"
          },
          label: {
            type: "string",
            description: "Optional label (e.g., 'Lead growth')"
          }
        },
        required: ["previousValue", "currentValue"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_forecast",
      description: "Simple linear forecast based on historical data. Projects future values based on trend. Use for budget planning or target setting.",
      parameters: {
        type: "object",
        properties: {
          historicalValues: {
            type: "array",
            items: { type: "number" },
            description: "Array of historical values in chronological order"
          },
          periodsToForecast: {
            type: "number",
            description: "Number of periods to forecast (default 3)"
          },
          label: {
            type: "string",
            description: "Label for the metric being forecast"
          }
        },
        required: ["historicalValues"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_weighted_average",
      description: "Calculate weighted average. Useful for blended CPL, weighted conversion rates, etc.",
      parameters: {
        type: "object",
        properties: {
          values: {
            type: "array",
            items: { type: "number" },
            description: "Array of values"
          },
          weights: {
            type: "array",
            items: { type: "number" },
            description: "Array of weights (must match values length)"
          },
          label: {
            type: "string",
            description: "Optional label for the result"
          }
        },
        required: ["values", "weights"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_cagr",
      description: "Calculate Compound Annual Growth Rate. Use for long-term growth analysis.",
      parameters: {
        type: "object",
        properties: {
          startValue: {
            type: "number",
            description: "Beginning value"
          },
          endValue: {
            type: "number",
            description: "Ending value"
          },
          periods: {
            type: "number",
            description: "Number of periods (years, months, etc.)"
          },
          periodType: {
            type: "string",
            enum: ["years", "months", "quarters"],
            description: "Type of period (default: years)"
          }
        },
        required: ["startValue", "endValue", "periods"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_break_even",
      description: "Calculate break-even point. How many enrollments needed to cover costs.",
      parameters: {
        type: "object",
        properties: {
          totalCost: {
            type: "number",
            description: "Total cost to cover"
          },
          revenuePerUnit: {
            type: "number",
            description: "Revenue per enrollment (course price)"
          },
          costPerUnit: {
            type: "number",
            description: "Variable cost per enrollment (optional, default 0)"
          }
        },
        required: ["totalCost", "revenuePerUnit"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "rank_items",
      description: "Rank a list of items by a metric. Returns top N or bottom N. Use for leaderboards or identifying best/worst performers.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "number" }
              }
            },
            description: "Array of items with name and value"
          },
          order: {
            type: "string",
            enum: ["top", "bottom"],
            description: "Return top (highest) or bottom (lowest) items"
          },
          limit: {
            type: "number",
            description: "Number of items to return (default 5)"
          },
          metric: {
            type: "string",
            description: "Name of the metric being ranked"
          }
        },
        required: ["items"]
      }
    }
  },
  // ============================================================================
  // UTILITY TOOLS
  // ============================================================================
  {
    type: "function" as const,
    function: {
      name: "get_date_range",
      description: "Get predefined date ranges. Use to quickly get dates for common periods like 'last month', 'this quarter', 'YTD'.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: [
              "today", "yesterday", "this_week", "last_week",
              "this_month", "last_month", "last_30_days", "last_90_days",
              "this_quarter", "last_quarter", "this_year", "last_year", "ytd"
            ],
            description: "Predefined period"
          }
        },
        required: ["period"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_current_datetime",
      description: "Get current date and time. Use when you need to know today's date for calculations or context.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "format_currency",
      description: "Format a number as currency (Euro). Use for clean output formatting.",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "number",
            description: "Number to format"
          },
          decimals: {
            type: "number",
            description: "Decimal places (default 2)"
          }
        },
        required: ["value"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "format_percentage",
      description: "Format a number as percentage. Use for clean output formatting.",
      parameters: {
        type: "object",
        properties: {
          value: {
            type: "number",
            description: "Number to format (e.g., 0.15 for 15% or 15 for 15%)"
          },
          isDecimal: {
            type: "boolean",
            description: "True if value is decimal (0.15), false if already percentage (15)"
          },
          decimals: {
            type: "number",
            description: "Decimal places (default 1)"
          }
        },
        required: ["value"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "summarize_data",
      description: "Calculate summary statistics for an array of numbers. Returns min, max, average, median, sum, count.",
      parameters: {
        type: "object",
        properties: {
          values: {
            type: "array",
            items: { type: "number" },
            description: "Array of numbers to summarize"
          },
          label: {
            type: "string",
            description: "Label for the data being summarized"
          }
        },
        required: ["values"]
      }
    }
  }
];

// ============================================================================
// Tool Executor - Runs the actual Prisma queries
// ============================================================================

export type ToolName = 
  // Core data tools
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
  | "compare_periods"
  // User & team tools
  | "get_users"
  | "get_goals"
  | "get_tasks"
  // Advanced analysis tools
  | "get_funnel_analysis"
  | "get_platform_comparison"
  | "get_lead_quality_analysis"
  | "get_response_time_analysis"
  | "get_enrollment_timeline"
  | "get_daily_activity"
  | "get_lost_leads_analysis"
  // Advanced math tools
  | "calculate_cpl"
  | "calculate_conversion_rate"
  | "calculate_growth_rate"
  | "calculate_forecast"
  | "calculate_weighted_average"
  | "calculate_cagr"
  | "calculate_break_even"
  | "rank_items"
  // Utility tools
  | "get_date_range"
  | "get_current_datetime"
  | "format_currency"
  | "format_percentage"
  | "summarize_data";

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
      // Core data tools
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
      // User & team tools
      case "get_users":
        return { success: true, data: await getUsers(args) };
      case "get_goals":
        return { success: true, data: await getGoals(args) };
      case "get_tasks":
        return { success: true, data: await getTasks(args) };
      // Advanced analysis tools
      case "get_funnel_analysis":
        return { success: true, data: await getFunnelAnalysis(args) };
      case "get_platform_comparison":
        return { success: true, data: await getPlatformComparison(args) };
      case "get_lead_quality_analysis":
        return { success: true, data: await getLeadQualityAnalysis(args) };
      case "get_response_time_analysis":
        return { success: true, data: await getResponseTimeAnalysis(args) };
      case "get_enrollment_timeline":
        return { success: true, data: await getEnrollmentTimeline(args) };
      case "get_daily_activity":
        return { success: true, data: await getDailyActivity(args) };
      case "get_lost_leads_analysis":
        return { success: true, data: await getLostLeadsAnalysis(args) };
      // Advanced math tools
      case "calculate_cpl":
        return { success: true, data: calculateCPL(args) };
      case "calculate_conversion_rate":
        return { success: true, data: calculateConversionRate(args) };
      case "calculate_growth_rate":
        return { success: true, data: calculateGrowthRate(args) };
      case "calculate_forecast":
        return { success: true, data: calculateForecast(args) };
      case "calculate_weighted_average":
        return { success: true, data: calculateWeightedAverage(args) };
      case "calculate_cagr":
        return { success: true, data: calculateCAGR(args) };
      case "calculate_break_even":
        return { success: true, data: calculateBreakEven(args) };
      case "rank_items":
        return { success: true, data: rankItems(args) };
      // Utility tools
      case "get_date_range":
        return { success: true, data: getDateRange(args) };
      case "get_current_datetime":
        return { success: true, data: getCurrentDatetime() };
      case "format_currency":
        return { success: true, data: formatCurrency(args) };
      case "format_percentage":
        return { success: true, data: formatPercentage(args) };
      case "summarize_data":
        return { success: true, data: summarizeData(args) };
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

// ============================================================================
// USER & TEAM TOOLS
// ============================================================================

async function getUsers(args: Record<string, unknown>) {
  type UserRoleType = "ADMIN" | "COMMERCIAL" | "MARKETING";
  
  const whereClause: { role?: UserRoleType } = {};
  if (args.role) {
    whereClause.role = args.role as UserRoleType;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: args.includeStats ? {
        select: {
          assignedLeads: true,
          contactedLeads: true,
          activities: true
        }
      } : undefined
    },
    orderBy: { name: "asc" }
  });

  return {
    filtri: { ruolo: args.role || "tutti" },
    utenti: users.map(u => ({
      id: u.id,
      nome: u.name,
      email: u.email,
      ruolo: u.role,
      creatoIl: u.createdAt.toISOString().split('T')[0],
      ...(args.includeStats && u._count ? {
        stats: {
          leadAssegnati: u._count.assignedLeads,
          leadContattati: u._count.contactedLeads,
          attivita: u._count.activities
        }
      } : {})
    })),
    totale: users.length
  };
}

async function getGoals(args: Record<string, unknown>) {
  const now = new Date();
  const month = (args.month as number) || now.getMonth() + 1;
  const year = (args.year as number) || now.getFullYear();
  const includeProgress = args.includeProgress !== false;

  const whereClause: { month: number; year: number; userId?: string } = { month, year };
  if (args.userId) {
    whereClause.userId = args.userId as string;
  }

  const goals = await prisma.goal.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } }
    }
  });

  // Get actual progress if requested
  let progress: Map<string, { leads: number; enrolled: number; calls: number; revenue: number }> = new Map();
  
  if (includeProgress && goals.length > 0) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    for (const goal of goals) {
      const [leadCount, enrolledCount, callCount, revenueData] = await Promise.all([
        prisma.lead.count({
          where: {
            contactedById: goal.userId,
            contactedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.lead.count({
          where: {
            contactedById: goal.userId,
            status: "ISCRITTO",
            enrolledAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.leadActivity.count({
          where: {
            userId: goal.userId,
            type: "CALL",
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.$queryRaw<[{ revenue: number }]>`
          SELECT COALESCE(SUM(co.price), 0)::float as revenue
          FROM "Lead" l
          JOIN "Course" co ON l."courseId" = co.id
          WHERE l."contactedById" = ${goal.userId}
            AND l.status = 'ISCRITTO'
            AND l."enrolledAt" >= ${startDate} AND l."enrolledAt" <= ${endDate}
        `
      ]);
      
      progress.set(goal.userId, {
        leads: leadCount,
        enrolled: enrolledCount,
        calls: callCount,
        revenue: revenueData[0]?.revenue || 0
      });
    }
  }

  return {
    mese: month,
    anno: year,
    obiettivi: goals.map(g => {
      const p = progress.get(g.userId);
      return {
        id: g.id,
        utente: g.user.name,
        obiettivi: {
          leadTarget: g.targetLeads,
          iscrittiTarget: g.targetEnrolled,
          chiamateTarget: g.targetCalls,
          ricavoTarget: Number(g.targetRevenue)
        },
        ...(includeProgress && p ? {
          progresso: {
            lead: p.leads,
            iscritti: p.enrolled,
            chiamate: p.calls,
            ricavo: p.revenue
          },
          percentualeCompletamento: {
            lead: g.targetLeads > 0 ? ((p.leads / g.targetLeads) * 100).toFixed(1) + "%" : "N/A",
            iscritti: g.targetEnrolled > 0 ? ((p.enrolled / g.targetEnrolled) * 100).toFixed(1) + "%" : "N/A",
            chiamate: g.targetCalls > 0 ? ((p.calls / g.targetCalls) * 100).toFixed(1) + "%" : "N/A",
            ricavo: Number(g.targetRevenue) > 0 ? ((p.revenue / Number(g.targetRevenue)) * 100).toFixed(1) + "%" : "N/A"
          }
        } : {})
      };
    })
  };
}

async function getTasks(args: Record<string, unknown>) {
  type TaskPriorityType = "HIGH" | "MEDIUM" | "LOW";
  
  const limit = Math.min((args.limit as number) || 20, 100);
  
  const whereClause: {
    userId?: string;
    completed?: boolean;
    priority?: TaskPriorityType;
    dueDate?: { lte: Date };
  } = {};
  
  if (args.userId) whereClause.userId = args.userId as string;
  if (args.completed !== undefined) whereClause.completed = args.completed as boolean;
  if (args.priority) whereClause.priority = args.priority as TaskPriorityType;
  if (args.dueBefore) whereClause.dueDate = { lte: new Date(args.dueBefore as string) };

  const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true } },
      lead: { select: { name: true, phone: true } }
    },
    orderBy: [
      { completed: "asc" },
      { dueDate: "asc" },
      { priority: "desc" }
    ],
    take: limit
  });

  const now = new Date();
  
  return {
    filtri: {
      utente: args.userId || "tutti",
      completato: args.completed !== undefined ? args.completed : "tutti",
      priorita: args.priority || "tutte"
    },
    tasks: tasks.map(t => ({
      id: t.id,
      titolo: t.title,
      descrizione: t.description,
      utente: t.user.name,
      lead: t.lead ? { nome: t.lead.name, telefono: t.lead.phone } : null,
      scadenza: t.dueDate.toISOString().split('T')[0],
      scaduto: t.dueDate < now && !t.completed,
      priorita: t.priority,
      completato: t.completed,
      completatoIl: t.completedAt?.toISOString().split('T')[0] || null
    })),
    riepilogo: {
      totale: tasks.length,
      completati: tasks.filter(t => t.completed).length,
      inSospeso: tasks.filter(t => !t.completed).length,
      scaduti: tasks.filter(t => t.dueDate < now && !t.completed).length
    }
  };
}

// ============================================================================
// ADVANCED ANALYSIS TOOLS
// ============================================================================

async function getFunnelAnalysis(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  // Build filters
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const commercialFilterSql = args.commercialId 
    ? Prisma.sql`AND (l."assignedToId" = ${args.commercialId as string} OR l."contactedById" = ${args.commercialId as string})` 
    : Prisma.empty;
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  const funnelData = await prisma.$queryRaw<{
    status: string;
    count: number;
  }[]>`
    SELECT l.status, COUNT(*)::int as count
    FROM "Lead" l
    ${platformJoinSql}
    WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
    ${platformFilterSql}
    ${courseFilterSql}
    ${commercialFilterSql}
    GROUP BY l.status
  `;

  const statusOrder = ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO", "PERSO"];
  const counts: Record<string, number> = {};
  for (const s of statusOrder) {
    counts[s] = funnelData.find(f => f.status === s)?.count || 0;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const inFunnel = total - counts["PERSO"]; // Active funnel excludes lost

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti",
      commerciale: args.commercialId || "tutti"
    },
    funnel: [
      {
        fase: "NUOVO",
        descrizione: "Lead appena arrivati",
        conteggio: counts["NUOVO"],
        percentualeTotale: total > 0 ? ((counts["NUOVO"] / total) * 100).toFixed(1) + "%" : "0%"
      },
      {
        fase: "CONTATTATO",
        descrizione: "Lead contattati",
        conteggio: counts["CONTATTATO"],
        percentualeTotale: total > 0 ? ((counts["CONTATTATO"] / total) * 100).toFixed(1) + "%" : "0%",
        conversioneDaFasePrecedente: counts["NUOVO"] > 0 
          ? (((counts["CONTATTATO"] + counts["IN_TRATTATIVA"] + counts["ISCRITTO"]) / (counts["NUOVO"] + counts["CONTATTATO"] + counts["IN_TRATTATIVA"] + counts["ISCRITTO"])) * 100).toFixed(1) + "%"
          : "N/A"
      },
      {
        fase: "IN_TRATTATIVA",
        descrizione: "Lead interessati (target)",
        conteggio: counts["IN_TRATTATIVA"],
        percentualeTotale: total > 0 ? ((counts["IN_TRATTATIVA"] / total) * 100).toFixed(1) + "%" : "0%"
      },
      {
        fase: "ISCRITTO",
        descrizione: "Lead convertiti",
        conteggio: counts["ISCRITTO"],
        percentualeTotale: total > 0 ? ((counts["ISCRITTO"] / total) * 100).toFixed(1) + "%" : "0%",
        tassoConversioneFinale: total > 0 ? ((counts["ISCRITTO"] / total) * 100).toFixed(1) + "%" : "0%"
      },
      {
        fase: "PERSO",
        descrizione: "Lead persi",
        conteggio: counts["PERSO"],
        percentualeTotale: total > 0 ? ((counts["PERSO"] / total) * 100).toFixed(1) + "%" : "0%"
      }
    ],
    metriche: {
      totaleLeads: total,
      leadAttiviFunnel: inFunnel,
      tassoConversione: total > 0 ? ((counts["ISCRITTO"] / total) * 100).toFixed(2) + "%" : "0%",
      tassoPerdita: total > 0 ? ((counts["PERSO"] / total) * 100).toFixed(2) + "%" : "0%"
    }
  };
}

async function getPlatformComparison(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const courseFilterSpendSql = args.courseId 
    ? Prisma.sql`AND c."courseId" = ${args.courseId as string}` 
    : Prisma.empty;

  const platforms = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];
  const results = [];

  for (const platform of platforms) {
    const [leadsData, enrollmentsData, spendData, revenueData] = await Promise.all([
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "Lead" l
        JOIN "Campaign" c ON l."campaignId" = c.id
        WHERE c.platform = ${platform}
          AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
          ${courseFilterSql}
      `.then(r => r[0]),
      prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM "Lead" l
        JOIN "Campaign" c ON l."campaignId" = c.id
        WHERE c.platform = ${platform}
          AND l.status = 'ISCRITTO'
          AND l."enrolledAt" >= ${startDate} AND l."enrolledAt" <= ${endDate}
          ${courseFilterSql}
      `.then(r => r[0]),
      prisma.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM(cs.amount), 0)::float as total 
        FROM "CampaignSpend" cs
        JOIN "Campaign" c ON cs."campaignId" = c.id
        WHERE c.platform = ${platform}
          AND cs."startDate" <= ${endDate} 
          AND (cs."endDate" >= ${startDate} OR cs."endDate" IS NULL)
          ${courseFilterSpendSql}
      `.then(r => r[0]),
      prisma.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM(co.price), 0)::float as total 
        FROM "Lead" l
        JOIN "Campaign" c ON l."campaignId" = c.id
        JOIN "Course" co ON l."courseId" = co.id
        WHERE c.platform = ${platform}
          AND l.status = 'ISCRITTO'
          AND l."enrolledAt" >= ${startDate} AND l."enrolledAt" <= ${endDate}
          ${courseFilterSql}
      `.then(r => r[0])
    ]);

    const leads = leadsData.count;
    const enrollments = enrollmentsData.count;
    const spend = spendData.total;
    const revenue = revenueData.total;

    results.push({
      piattaforma: platform,
      leads,
      iscrizioni: enrollments,
      spesa: spend.toFixed(2),
      ricavo: revenue.toFixed(2),
      cpl: leads > 0 ? (spend / leads).toFixed(2) : "N/A",
      tassoConversione: leads > 0 ? ((enrollments / leads) * 100).toFixed(2) + "%" : "N/A",
      costoPerIscrizione: enrollments > 0 ? (spend / enrollments).toFixed(2) : "N/A",
      roi: spend > 0 ? (((revenue - spend) / spend) * 100).toFixed(1) + "%" : "N/A",
      profitto: (revenue - spend).toFixed(2)
    });
  }

  // Sort by ROI (best first)
  results.sort((a, b) => {
    const roiA = parseFloat(a.roi.replace('%', '')) || -Infinity;
    const roiB = parseFloat(b.roi.replace('%', '')) || -Infinity;
    return roiB - roiA;
  });

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: { corso: args.courseId || "tutti" },
    confronto: results,
    classifiche: {
      migliorROI: results[0]?.piattaforma || "N/A",
      piuLeads: [...results].sort((a, b) => b.leads - a.leads)[0]?.piattaforma || "N/A",
      migliorCPL: [...results].filter(r => r.cpl !== "N/A").sort((a, b) => parseFloat(a.cpl) - parseFloat(b.cpl))[0]?.piattaforma || "N/A",
      migliorConversione: [...results].filter(r => r.tassoConversione !== "N/A").sort((a, b) => parseFloat(b.tassoConversione) - parseFloat(a.tassoConversione))[0]?.piattaforma || "N/A"
    }
  };
}

async function getLeadQualityAnalysis(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);
  const groupBy = (args.groupBy as string) || "platform";

  let query;
  let groupField: string;

  switch (groupBy) {
    case "platform":
      groupField = "c.platform";
      query = prisma.$queryRaw<{
        group_value: string;
        total_leads: number;
        contacted: number;
        enrolled: number;
        lost: number;
        avg_days_to_contact: number;
        avg_days_to_enroll: number;
        avg_call_attempts: number;
      }[]>`
        SELECT 
          c.platform as group_value,
          COUNT(*)::int as total_leads,
          COUNT(CASE WHEN l.contacted = true THEN 1 END)::int as contacted,
          COUNT(CASE WHEN l.status = 'ISCRITTO' THEN 1 END)::int as enrolled,
          COUNT(CASE WHEN l.status = 'PERSO' THEN 1 END)::int as lost,
          AVG(EXTRACT(EPOCH FROM (l."contactedAt" - l."createdAt"))/86400)::float as avg_days_to_contact,
          AVG(CASE WHEN l.status = 'ISCRITTO' THEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 END)::float as avg_days_to_enroll,
          AVG(l."callAttempts")::float as avg_call_attempts
        FROM "Lead" l
        JOIN "Campaign" c ON l."campaignId" = c.id
        WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
        GROUP BY c.platform
        ORDER BY enrolled DESC
      `;
      break;
    case "course":
      groupField = "co.name";
      query = prisma.$queryRaw<{
        group_value: string;
        total_leads: number;
        contacted: number;
        enrolled: number;
        lost: number;
        avg_days_to_contact: number;
        avg_days_to_enroll: number;
        avg_call_attempts: number;
      }[]>`
        SELECT 
          co.name as group_value,
          COUNT(*)::int as total_leads,
          COUNT(CASE WHEN l.contacted = true THEN 1 END)::int as contacted,
          COUNT(CASE WHEN l.status = 'ISCRITTO' THEN 1 END)::int as enrolled,
          COUNT(CASE WHEN l.status = 'PERSO' THEN 1 END)::int as lost,
          AVG(EXTRACT(EPOCH FROM (l."contactedAt" - l."createdAt"))/86400)::float as avg_days_to_contact,
          AVG(CASE WHEN l.status = 'ISCRITTO' THEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 END)::float as avg_days_to_enroll,
          AVG(l."callAttempts")::float as avg_call_attempts
        FROM "Lead" l
        JOIN "Course" co ON l."courseId" = co.id
        WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
        GROUP BY co.name
        ORDER BY enrolled DESC
      `;
      break;
    default:
      return { error: `Group by '${groupBy}' not supported` };
  }

  const data = await query;

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    raggruppamento: groupBy,
    analisi: data.map(d => ({
      gruppo: d.group_value,
      leadTotali: d.total_leads,
      contattati: d.contacted,
      iscritti: d.enrolled,
      persi: d.lost,
      tassoContatto: d.total_leads > 0 ? ((d.contacted / d.total_leads) * 100).toFixed(1) + "%" : "N/A",
      tassoConversione: d.total_leads > 0 ? ((d.enrolled / d.total_leads) * 100).toFixed(1) + "%" : "N/A",
      tassoPerdita: d.total_leads > 0 ? ((d.lost / d.total_leads) * 100).toFixed(1) + "%" : "N/A",
      giorniMediPerContatto: d.avg_days_to_contact?.toFixed(1) || "N/A",
      giorniMediPerIscrizione: d.avg_days_to_enroll?.toFixed(1) || "N/A",
      tentativiMediChiamata: d.avg_call_attempts?.toFixed(1) || "N/A"
    }))
  };
}

async function getResponseTimeAnalysis(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const commercialFilterSql = args.commercialId 
    ? Prisma.sql`AND l."contactedById" = ${args.commercialId as string}` 
    : Prisma.empty;
  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  const data = await prisma.$queryRaw<{
    total_contacted: number;
    contacted_same_day: number;
    contacted_within_24h: number;
    contacted_within_48h: number;
    contacted_within_week: number;
    contacted_later: number;
    avg_response_hours: number;
    enrolled_same_day: number;
    enrolled_within_24h: number;
    enrolled_within_48h: number;
  }[]>`
    SELECT 
      COUNT(*)::int as total_contacted,
      COUNT(CASE WHEN DATE(l."contactedAt") = DATE(l."createdAt") THEN 1 END)::int as contacted_same_day,
      COUNT(CASE WHEN l."contactedAt" - l."createdAt" <= interval '24 hours' THEN 1 END)::int as contacted_within_24h,
      COUNT(CASE WHEN l."contactedAt" - l."createdAt" <= interval '48 hours' THEN 1 END)::int as contacted_within_48h,
      COUNT(CASE WHEN l."contactedAt" - l."createdAt" <= interval '7 days' THEN 1 END)::int as contacted_within_week,
      COUNT(CASE WHEN l."contactedAt" - l."createdAt" > interval '7 days' THEN 1 END)::int as contacted_later,
      AVG(EXTRACT(EPOCH FROM (l."contactedAt" - l."createdAt"))/3600)::float as avg_response_hours,
      COUNT(CASE WHEN l.status = 'ISCRITTO' AND DATE(l."contactedAt") = DATE(l."createdAt") THEN 1 END)::int as enrolled_same_day,
      COUNT(CASE WHEN l.status = 'ISCRITTO' AND l."contactedAt" - l."createdAt" <= interval '24 hours' THEN 1 END)::int as enrolled_within_24h,
      COUNT(CASE WHEN l.status = 'ISCRITTO' AND l."contactedAt" - l."createdAt" <= interval '48 hours' THEN 1 END)::int as enrolled_within_48h
    FROM "Lead" l
    ${platformJoinSql}
    WHERE l."contactedAt" IS NOT NULL
      AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
      ${commercialFilterSql}
      ${platformFilterSql}
  `;

  const d = data[0];
  const total = d.total_contacted;

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      commerciale: args.commercialId || "tutti",
      piattaforma: args.platform || "tutte"
    },
    leadContattati: total,
    tempoRispostaMedio: d.avg_response_hours ? `${d.avg_response_hours.toFixed(1)} ore` : "N/A",
    distribuzione: {
      stessoGiorno: {
        conteggio: d.contacted_same_day,
        percentuale: total > 0 ? ((d.contacted_same_day / total) * 100).toFixed(1) + "%" : "0%"
      },
      entro24ore: {
        conteggio: d.contacted_within_24h,
        percentuale: total > 0 ? ((d.contacted_within_24h / total) * 100).toFixed(1) + "%" : "0%"
      },
      entro48ore: {
        conteggio: d.contacted_within_48h,
        percentuale: total > 0 ? ((d.contacted_within_48h / total) * 100).toFixed(1) + "%" : "0%"
      },
      entroSettimana: {
        conteggio: d.contacted_within_week,
        percentuale: total > 0 ? ((d.contacted_within_week / total) * 100).toFixed(1) + "%" : "0%"
      },
      piuDiSettimana: {
        conteggio: d.contacted_later,
        percentuale: total > 0 ? ((d.contacted_later / total) * 100).toFixed(1) + "%" : "0%"
      }
    },
    conversionePerVelocita: {
      contattatoStessoGiorno: d.contacted_same_day > 0 
        ? ((d.enrolled_same_day / d.contacted_same_day) * 100).toFixed(1) + "%" 
        : "N/A",
      contattatoEntro24ore: d.contacted_within_24h > 0 
        ? ((d.enrolled_within_24h / d.contacted_within_24h) * 100).toFixed(1) + "%" 
        : "N/A",
      contattatoEntro48ore: d.contacted_within_48h > 0 
        ? ((d.enrolled_within_48h / d.contacted_within_48h) * 100).toFixed(1) + "%" 
        : "N/A"
    },
    insight: d.avg_response_hours && d.avg_response_hours > 24 
      ? "Il tempo di risposta medio è superiore a 24 ore. Rispondere più rapidamente potrebbe migliorare le conversioni."
      : "Buon tempo di risposta!"
  };
}

async function getEnrollmentTimeline(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const platformJoinSql = (args.platform) 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  const data = await prisma.$queryRaw<{
    total_enrolled: number;
    within_7_days: number;
    within_14_days: number;
    within_30_days: number;
    within_60_days: number;
    over_60_days: number;
    avg_days: number;
    min_days: number;
    max_days: number;
  }[]>`
    SELECT 
      COUNT(*)::int as total_enrolled,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 <= 7 THEN 1 END)::int as within_7_days,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 <= 14 THEN 1 END)::int as within_14_days,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 <= 30 THEN 1 END)::int as within_30_days,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 <= 60 THEN 1 END)::int as within_60_days,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400 > 60 THEN 1 END)::int as over_60_days,
      AVG(EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400)::float as avg_days,
      MIN(EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400)::float as min_days,
      MAX(EXTRACT(EPOCH FROM (l."enrolledAt" - l."createdAt"))/86400)::float as max_days
    FROM "Lead" l
    ${platformJoinSql}
    WHERE l.status = 'ISCRITTO'
      AND l."enrolledAt" IS NOT NULL
      AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
      ${platformFilterSql}
      ${courseFilterSql}
  `;

  const d = data[0];
  const total = d.total_enrolled;

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti"
    },
    iscrizioniTotali: total,
    tempoMedioConversione: d.avg_days ? `${d.avg_days.toFixed(1)} giorni` : "N/A",
    tempoMinimo: d.min_days ? `${d.min_days.toFixed(1)} giorni` : "N/A",
    tempoMassimo: d.max_days ? `${d.max_days.toFixed(1)} giorni` : "N/A",
    distribuzione: {
      entro7giorni: {
        conteggio: d.within_7_days,
        percentuale: total > 0 ? ((d.within_7_days / total) * 100).toFixed(1) + "%" : "0%"
      },
      entro14giorni: {
        conteggio: d.within_14_days,
        percentuale: total > 0 ? ((d.within_14_days / total) * 100).toFixed(1) + "%" : "0%"
      },
      entro30giorni: {
        conteggio: d.within_30_days,
        percentuale: total > 0 ? ((d.within_30_days / total) * 100).toFixed(1) + "%" : "0%"
      },
      entro60giorni: {
        conteggio: d.within_60_days,
        percentuale: total > 0 ? ((d.within_60_days / total) * 100).toFixed(1) + "%" : "0%"
      },
      oltre60giorni: {
        conteggio: d.over_60_days,
        percentuale: total > 0 ? ((d.over_60_days / total) * 100).toFixed(1) + "%" : "0%"
      }
    }
  };
}

async function getDailyActivity(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const commercialFilterSql = args.commercialId 
    ? Prisma.sql`AND l."contactedById" = ${args.commercialId as string}` 
    : Prisma.empty;
  const commercialFilterActivitySql = args.commercialId 
    ? Prisma.sql`AND la."userId" = ${args.commercialId as string}` 
    : Prisma.empty;

  const [leadsPerDay, callsPerDay, enrollmentsPerDay, contactsPerDay] = await Promise.all([
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE(l."createdAt") as date, COUNT(*)::int as count
      FROM "Lead" l
      WHERE l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
      GROUP BY DATE(l."createdAt")
      ORDER BY date
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE(la."createdAt") as date, COUNT(*)::int as count
      FROM "LeadActivity" la
      WHERE la.type = 'CALL'
        AND la."createdAt" >= ${startDate} AND la."createdAt" <= ${endDate}
        ${commercialFilterActivitySql}
      GROUP BY DATE(la."createdAt")
      ORDER BY date
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE(l."enrolledAt") as date, COUNT(*)::int as count
      FROM "Lead" l
      WHERE l.status = 'ISCRITTO'
        AND l."enrolledAt" >= ${startDate} AND l."enrolledAt" <= ${endDate}
        ${commercialFilterSql}
      GROUP BY DATE(l."enrolledAt")
      ORDER BY date
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE(l."contactedAt") as date, COUNT(*)::int as count
      FROM "Lead" l
      WHERE l."contactedAt" >= ${startDate} AND l."contactedAt" <= ${endDate}
        ${commercialFilterSql}
      GROUP BY DATE(l."contactedAt")
      ORDER BY date
    `
  ]);

  // Merge all data by date
  const dateMap = new Map<string, { leads: number; calls: number; enrollments: number; contacts: number }>();
  
  for (const l of leadsPerDay) {
    const key = l.date.toISOString().split('T')[0];
    dateMap.set(key, { ...(dateMap.get(key) || { leads: 0, calls: 0, enrollments: 0, contacts: 0 }), leads: l.count });
  }
  for (const c of callsPerDay) {
    const key = c.date.toISOString().split('T')[0];
    dateMap.set(key, { ...(dateMap.get(key) || { leads: 0, calls: 0, enrollments: 0, contacts: 0 }), calls: c.count });
  }
  for (const e of enrollmentsPerDay) {
    const key = e.date.toISOString().split('T')[0];
    dateMap.set(key, { ...(dateMap.get(key) || { leads: 0, calls: 0, enrollments: 0, contacts: 0 }), enrollments: e.count });
  }
  for (const c of contactsPerDay) {
    const key = c.date.toISOString().split('T')[0];
    dateMap.set(key, { ...(dateMap.get(key) || { leads: 0, calls: 0, enrollments: 0, contacts: 0 }), contacts: c.count });
  }

  const dailyData = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({
      data: date,
      leads: data.leads,
      chiamate: data.calls,
      iscrizioni: data.enrollments,
      contatti: data.contacts
    }));

  const totals = dailyData.reduce((acc, d) => ({
    leads: acc.leads + d.leads,
    calls: acc.calls + d.chiamate,
    enrollments: acc.enrollments + d.iscrizioni,
    contacts: acc.contacts + d.contatti
  }), { leads: 0, calls: 0, enrollments: 0, contacts: 0 });

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: { commerciale: args.commercialId || "tutti" },
    giornaliero: dailyData,
    totali: {
      leads: totals.leads,
      chiamate: totals.calls,
      iscrizioni: totals.enrollments,
      contatti: totals.contacts
    },
    medie: {
      leadsGiorno: dailyData.length > 0 ? (totals.leads / dailyData.length).toFixed(1) : "0",
      chiamateGiorno: dailyData.length > 0 ? (totals.calls / dailyData.length).toFixed(1) : "0",
      iscrizioniGiorno: dailyData.length > 0 ? (totals.enrollments / dailyData.length).toFixed(1) : "0",
      contattiGiorno: dailyData.length > 0 ? (totals.contacts / dailyData.length).toFixed(1) : "0"
    }
  };
}

async function getLostLeadsAnalysis(args: Record<string, unknown>) {
  const startDate = new Date(args.startDate as string);
  const endDate = new Date(args.endDate as string);
  endDate.setHours(23, 59, 59, 999);

  const platformFilterSql = args.platform 
    ? Prisma.sql`AND c.platform = ${args.platform as string}` 
    : Prisma.empty;
  const courseFilterSql = args.courseId 
    ? Prisma.sql`AND l."courseId" = ${args.courseId as string}` 
    : Prisma.empty;
  const platformJoinSql = args.platform 
    ? Prisma.sql`JOIN "Campaign" c ON l."campaignId" = c.id` 
    : Prisma.empty;

  const [lostByOutcome, lostByAttempts, lostByPlatform, totalLost, totalLeads] = await Promise.all([
    prisma.$queryRaw<{ outcome: string; count: number }[]>`
      SELECT l."callOutcome" as outcome, COUNT(*)::int as count
      FROM "Lead" l
      ${platformJoinSql}
      WHERE l.status = 'PERSO'
        AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
        ${platformFilterSql}
        ${courseFilterSql}
      GROUP BY l."callOutcome"
    `,
    prisma.$queryRaw<{ attempts: number; count: number }[]>`
      SELECT l."callAttempts" as attempts, COUNT(*)::int as count
      FROM "Lead" l
      ${platformJoinSql}
      WHERE l.status = 'PERSO'
        AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
        ${platformFilterSql}
        ${courseFilterSql}
      GROUP BY l."callAttempts"
      ORDER BY attempts
    `,
    prisma.$queryRaw<{ platform: string; count: number }[]>`
      SELECT c.platform, COUNT(*)::int as count
      FROM "Lead" l
      JOIN "Campaign" c ON l."campaignId" = c.id
      WHERE l.status = 'PERSO'
        AND l."createdAt" >= ${startDate} AND l."createdAt" <= ${endDate}
        ${platformFilterSql}
        ${courseFilterSql}
      GROUP BY c.platform
      ORDER BY count DESC
    `,
    prisma.lead.count({
      where: {
        status: "PERSO",
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    })
  ]);

  return {
    periodo: { inizio: startDate.toISOString().split('T')[0], fine: endDate.toISOString().split('T')[0] },
    filtri: {
      piattaforma: args.platform || "tutte",
      corso: args.courseId || "tutti"
    },
    leadPersi: totalLost,
    leadTotali: totalLeads,
    tassoPerdita: totalLeads > 0 ? ((totalLost / totalLeads) * 100).toFixed(2) + "%" : "0%",
    perEsitoChiamata: lostByOutcome.map(o => ({
      esito: o.outcome || "Mai chiamato",
      conteggio: o.count,
      percentuale: totalLost > 0 ? ((o.count / totalLost) * 100).toFixed(1) + "%" : "0%"
    })),
    perTentativiChiamata: lostByAttempts.map(a => ({
      tentativi: a.attempts,
      conteggio: a.count,
      percentuale: totalLost > 0 ? ((a.count / totalLost) * 100).toFixed(1) + "%" : "0%"
    })),
    perPiattaforma: lostByPlatform.map(p => ({
      piattaforma: p.platform,
      persi: p.count,
      percentuale: totalLost > 0 ? ((p.count / totalLost) * 100).toFixed(1) + "%" : "0%"
    })),
    insight: lostByOutcome.find(o => o.outcome === null && o.count > totalLost * 0.3)
      ? "Molti lead sono persi senza essere mai stati chiamati. Migliorare il follow-up potrebbe ridurre le perdite."
      : lostByAttempts.find(a => a.attempts >= 8 && a.count > totalLost * 0.2)
        ? "Molti lead sono persi dopo 8 tentativi. Considerare strategie alternative per questi contatti difficili."
        : "Distribuzione normale delle perdite."
  };
}

// ============================================================================
// ADVANCED MATH TOOLS
// ============================================================================

function calculateCPL(args: Record<string, unknown>) {
  const spend = args.spend as number;
  const leads = args.leads as number;

  if (leads === 0) {
    return { error: "Impossibile calcolare CPL: 0 lead" };
  }

  const cpl = spend / leads;

  return {
    spesa: spend,
    leads: leads,
    cpl: cpl,
    cplFormattato: `€${cpl.toFixed(2)}`,
    formula: `${spend} / ${leads} = ${cpl.toFixed(2)}`
  };
}

function calculateConversionRate(args: Record<string, unknown>) {
  const converted = args.converted as number;
  const total = args.total as number;
  const label = args.label as string | undefined;

  if (total === 0) {
    return { error: "Impossibile calcolare: divisione per zero" };
  }

  const rate = (converted / total) * 100;

  return {
    convertiti: converted,
    totale: total,
    tassoConversione: rate,
    formattato: `${rate.toFixed(2)}%`,
    formula: `(${converted} / ${total}) × 100 = ${rate.toFixed(2)}%`,
    etichetta: label || "Tasso di conversione"
  };
}

function calculateGrowthRate(args: Record<string, unknown>) {
  const previousValue = args.previousValue as number;
  const currentValue = args.currentValue as number;
  const label = args.label as string | undefined;

  if (previousValue === 0) {
    return {
      valorePrecedente: previousValue,
      valoreAttuale: currentValue,
      crescita: currentValue > 0 ? "∞" : "0%",
      direzione: currentValue > 0 ? "aumento" : "invariato",
      etichetta: label || "Crescita"
    };
  }

  const growth = ((currentValue - previousValue) / previousValue) * 100;
  const direction = growth > 0 ? "aumento" : growth < 0 ? "diminuzione" : "invariato";

  return {
    valorePrecedente: previousValue,
    valoreAttuale: currentValue,
    crescita: `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`,
    crescitaNumerica: growth,
    variazioneAssoluta: currentValue - previousValue,
    direzione: direction,
    formula: `((${currentValue} - ${previousValue}) / ${previousValue}) × 100 = ${growth.toFixed(2)}%`,
    etichetta: label || "Crescita"
  };
}

function calculateForecast(args: Record<string, unknown>) {
  const values = args.historicalValues as number[];
  const periodsToForecast = (args.periodsToForecast as number) || 3;
  const label = args.label as string | undefined;

  if (!values || values.length < 2) {
    return { error: "Servono almeno 2 valori storici per prevedere" };
  }

  // Simple linear regression
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecasts
  const forecasts = [];
  for (let i = 0; i < periodsToForecast; i++) {
    const forecastPeriod = n + i;
    const forecastValue = intercept + slope * forecastPeriod;
    forecasts.push({
      periodo: forecastPeriod + 1,
      valore: Math.max(0, forecastValue), // Don't allow negative
      valoreFormattato: Math.max(0, forecastValue).toFixed(2)
    });
  }

  // Calculate trend
  const trend = slope > 0 ? "crescente" : slope < 0 ? "decrescente" : "stabile";
  const avgGrowth = values.length > 1 
    ? ((values[values.length - 1] - values[0]) / values[0] / (values.length - 1) * 100).toFixed(1) + "%"
    : "N/A";

  return {
    valoriStorici: values,
    previsioni: forecasts,
    trend: trend,
    pendenza: slope.toFixed(4),
    crescitaMediaPeriodo: avgGrowth,
    etichetta: label || "Previsione",
    nota: "Previsione basata su regressione lineare semplice. Usare come stima indicativa."
  };
}

function calculateWeightedAverage(args: Record<string, unknown>) {
  const values = args.values as number[];
  const weights = args.weights as number[];
  const label = args.label as string | undefined;

  if (!values || !weights || values.length !== weights.length) {
    return { error: "Valori e pesi devono avere la stessa lunghezza" };
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return { error: "Somma dei pesi non può essere zero" };
  }

  let weightedSum = 0;
  for (let i = 0; i < values.length; i++) {
    weightedSum += values[i] * weights[i];
  }

  const weightedAvg = weightedSum / totalWeight;

  return {
    valori: values,
    pesi: weights,
    mediaPonderata: weightedAvg,
    formattato: weightedAvg.toFixed(2),
    formula: `(${values.map((v, i) => `${v}×${weights[i]}`).join(' + ')}) / ${totalWeight} = ${weightedAvg.toFixed(2)}`,
    etichetta: label || "Media ponderata"
  };
}

function calculateCAGR(args: Record<string, unknown>) {
  const startValue = args.startValue as number;
  const endValue = args.endValue as number;
  const periods = args.periods as number;
  const periodType = (args.periodType as string) || "years";

  if (startValue <= 0) {
    return { error: "Il valore iniziale deve essere maggiore di zero" };
  }
  if (periods <= 0) {
    return { error: "Il numero di periodi deve essere maggiore di zero" };
  }

  const cagr = (Math.pow(endValue / startValue, 1 / periods) - 1) * 100;

  const periodLabel = periodType === "years" ? "anni" : periodType === "months" ? "mesi" : "trimestri";

  return {
    valoreIniziale: startValue,
    valoreFinale: endValue,
    periodi: periods,
    tipoPeriodo: periodLabel,
    cagr: cagr,
    formattato: `${cagr.toFixed(2)}%`,
    formula: `((${endValue}/${startValue})^(1/${periods}) - 1) × 100 = ${cagr.toFixed(2)}%`,
    interpretazione: `Crescita media del ${cagr.toFixed(2)}% per ${periodLabel === "anni" ? "anno" : periodLabel === "mesi" ? "mese" : "trimestre"}`
  };
}

function calculateBreakEven(args: Record<string, unknown>) {
  const totalCost = args.totalCost as number;
  const revenuePerUnit = args.revenuePerUnit as number;
  const costPerUnit = (args.costPerUnit as number) || 0;

  const marginPerUnit = revenuePerUnit - costPerUnit;
  
  if (marginPerUnit <= 0) {
    return { error: "Il margine per unità deve essere positivo (ricavo > costo per unità)" };
  }

  const breakEvenUnits = totalCost / marginPerUnit;
  const breakEvenRevenue = breakEvenUnits * revenuePerUnit;

  return {
    costoTotale: totalCost,
    ricavoPerUnita: revenuePerUnit,
    costoPerUnita: costPerUnit,
    marginePerUnita: marginPerUnit,
    breakEvenUnita: Math.ceil(breakEvenUnits),
    breakEvenRicavo: breakEvenRevenue.toFixed(2),
    formula: `${totalCost} / (${revenuePerUnit} - ${costPerUnit}) = ${breakEvenUnits.toFixed(2)} unità`,
    interpretazione: `Servono ${Math.ceil(breakEvenUnits)} iscrizioni per coprire i costi`
  };
}

function rankItems(args: Record<string, unknown>) {
  const items = args.items as { name: string; value: number }[];
  const order = (args.order as string) || "top";
  const limit = (args.limit as number) || 5;
  const metric = (args.metric as string) || "valore";

  if (!items || items.length === 0) {
    return { error: "Nessun elemento da classificare" };
  }

  const sorted = [...items].sort((a, b) => 
    order === "top" ? b.value - a.value : a.value - b.value
  );

  const ranked = sorted.slice(0, limit).map((item, index) => ({
    posizione: index + 1,
    nome: item.name,
    valore: item.value,
    valoreFormattato: typeof item.value === 'number' 
      ? (Number.isInteger(item.value) ? item.value.toString() : item.value.toFixed(2))
      : item.value
  }));

  return {
    classifica: order === "top" ? "migliori" : "peggiori",
    metrica: metric,
    limite: limit,
    risultati: ranked,
    totaleElementi: items.length
  };
}

// ============================================================================
// UTILITY TOOLS
// ============================================================================

function getDateRange(args: Record<string, unknown>) {
  const period = args.period as string;
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now);

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "yesterday":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;
    case "this_week":
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      break;
    case "last_week":
      const lastWeekEnd = new Date(now);
      const lastDayOfWeek = lastWeekEnd.getDay();
      const lastMondayOffset = lastDayOfWeek === 0 ? -6 : 1 - lastDayOfWeek;
      endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate() + lastMondayOffset - 1, 23, 59, 59);
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 6);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case "last_30_days":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      break;
    case "last_90_days":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      break;
    case "this_quarter":
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    case "last_quarter":
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
      startDate = new Date(lastQuarterYear, adjustedLastQuarter * 3, 1);
      endDate = new Date(lastQuarterYear, (adjustedLastQuarter + 1) * 3, 0, 23, 59, 59);
      break;
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "last_year":
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    case "ytd":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return { error: `Periodo '${period}' non riconosciuto` };
  }

  return {
    periodo: period,
    inizio: startDate.toISOString().split('T')[0],
    fine: endDate.toISOString().split('T')[0],
    giorniInclusi: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  };
}

function getCurrentDatetime() {
  const now = new Date();
  const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", 
                       "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  return {
    data: now.toISOString().split('T')[0],
    ora: now.toTimeString().split(' ')[0],
    timestamp: now.toISOString(),
    giorno: now.getDate(),
    mese: now.getMonth() + 1,
    anno: now.getFullYear(),
    giornoSettimana: dayNames[now.getDay()],
    nomeMese: monthNames[now.getMonth()],
    trimestre: Math.floor(now.getMonth() / 3) + 1,
    settimanaAnno: Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
  };
}

function formatCurrency(args: Record<string, unknown>) {
  const value = args.value as number;
  const decimals = (args.decimals as number) ?? 2;

  return {
    valoreOriginale: value,
    formattato: `€${value.toFixed(decimals)}`,
    formattatoConMigliaia: `€${value.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  };
}

function formatPercentage(args: Record<string, unknown>) {
  const value = args.value as number;
  const isDecimal = (args.isDecimal as boolean) ?? (value >= -1 && value <= 1);
  const decimals = (args.decimals as number) ?? 1;

  const percentValue = isDecimal ? value * 100 : value;

  return {
    valoreOriginale: value,
    percentuale: percentValue,
    formattato: `${percentValue.toFixed(decimals)}%`,
    conSegno: `${percentValue >= 0 ? '+' : ''}${percentValue.toFixed(decimals)}%`
  };
}

function summarizeData(args: Record<string, unknown>) {
  const values = args.values as number[];
  const label = args.label as string | undefined;

  if (!values || values.length === 0) {
    return { error: "Nessun valore da analizzare" };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Calculate median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];

  // Calculate standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    etichetta: label || "Statistiche",
    conteggio: values.length,
    somma: sum,
    media: avg,
    mediana: median,
    minimo: min,
    massimo: max,
    range: max - min,
    deviazioneStandard: stdDev,
    formattato: {
      somma: sum.toFixed(2),
      media: avg.toFixed(2),
      mediana: median.toFixed(2),
      deviazioneStandard: stdDev.toFixed(2)
    }
  };
}
