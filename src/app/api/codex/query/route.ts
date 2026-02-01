/**
 * AI Query Route
 * 
 * Accepts natural language questions about CRM data and returns AI-powered answers
 * using multi-provider routing (Groq, OpenRouter) with automatic fallback.
 * 
 * No user authentication to AI providers needed - uses server-side API keys.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryAI, getRateLimitSummary } from "@/lib/ai-providers";
import { prisma } from "@/lib/prisma";

// System prompt that explains the CRM context
const SYSTEM_PROMPT = `Sei un assistente AI per un CRM di gestione lead di Job Formazione, un'azienda di formazione italiana.

CONTESTO DATABASE:
- Lead: potenziali clienti con stati (NUOVO, CONTATTATO, IN_TRATTATIVA, ISCRITTO, PERSO)
- Campaign: campagne pubblicitarie su piattaforme (META, GOOGLE_ADS, LINKEDIN, TIKTOK)
- CampaignSpend: spese per campagna con date
- Course: corsi offerti con prezzi
- User: utenti con ruoli (ADMIN, COMMERCIAL, MARKETING)

DATI DISPONIBILI (ti verranno forniti nel messaggio):
I dati aggregati del CRM saranno inclusi nel messaggio dell'utente.

ISTRUZIONI:
1. Rispondi sempre in italiano
2. Usa i dati forniti per rispondere alle domande
3. Sii conciso ma preciso
4. Se servono calcoli (ROI, CPL, tassi di conversione), falli
5. Formatta numeri in modo leggibile (es. 1.234,56 EUR)
6. Se i dati non sono sufficienti, dillo chiaramente
7. Usa elenchi puntati e formattazione per chiarezza

ESEMPI DI DOMANDE:
- "Qual e il CPL medio per META questo mese?"
- "Quanti lead sono stati convertiti negli ultimi 30 giorni?"
- "Quale campagna ha il miglior ROI?"
- "Confronta le performance tra piattaforme"
`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use AI Analytics
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { question, context } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Check if any providers are configured
    const status = getRateLimitSummary();
    if (status.configuredProviders.length === 0) {
      return NextResponse.json(
        { 
          error: "AI non configurato. Contatta l'amministratore per configurare GROQ_API_KEY o OPENROUTER_API_KEY.",
          code: "NO_PROVIDERS"
        },
        { status: 503 }
      );
    }

    // Fetch relevant CRM data based on the question
    const crmData = await fetchCRMData();

    // Build the user message with context
    const userMessage = `
DATI CRM ATTUALI:
${JSON.stringify(crmData, null, 2)}

${context ? `CONTESTO AGGIUNTIVO:\n${context}\n\n` : ""}DOMANDA:
${question}
`;

    // Make the API call using the multi-provider router
    const result = await queryAI(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      {
        temperature: 0.3, // Lower temperature for more factual responses
        maxTokens: 4000,
      }
    );

    return NextResponse.json({
      answer: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error("Query error:", error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("Rate limit")) {
        return NextResponse.json(
          { 
            error: "Limite di richieste raggiunto. Riprova tra qualche minuto.",
            code: "RATE_LIMITED"
          },
          { status: 429 }
        );
      }
      if (error.message.includes("No AI providers configured")) {
        return NextResponse.json(
          { 
            error: "AI non configurato. Contatta l'amministratore.",
            code: "NO_PROVIDERS"
          },
          { status: 503 }
        );
      }
      if (error.message.includes("All AI models")) {
        return NextResponse.json(
          { 
            error: "Tutti i modelli AI sono temporaneamente non disponibili. Riprova tra qualche minuto.",
            code: "ALL_RATE_LIMITED"
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check AI status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = getRateLimitSummary();
    
    return NextResponse.json({
      configured: status.configuredProviders.length > 0,
      providers: status.configuredProviders,
      availableModels: status.availableModels,
      rateLimitedModels: status.rateLimitedModels,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}

/**
 * Fetch aggregated CRM data for AI analysis
 */
async function fetchCRMData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all queries in parallel for efficiency
  const [
    leadStats,
    leadsByStatus,
    leadsByPlatform,
    campaignStats,
    spendByPlatform,
    recentLeads,
    courseStats,
    commercialStats,
  ] = await Promise.all([
    // Overall lead statistics
    prisma.lead.aggregate({
      _count: true,
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    
    // Leads by status
    prisma.lead.groupBy({
      by: ["status"],
      _count: true,
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    
    // Leads by platform (via campaign)
    prisma.$queryRaw`
      SELECT c.platform, COUNT(l.id)::int as count
      FROM "Lead" l
      JOIN "Campaign" c ON l."campaignId" = c.id
      WHERE l."createdAt" >= ${thirtyDaysAgo}
      GROUP BY c.platform
    `,
    
    // Campaign statistics
    prisma.campaign.aggregate({
      _count: true,
      where: {
        status: "ACTIVE",
      },
    }),
    
    // Spend by platform (last 30 days)
    prisma.$queryRaw`
      SELECT c.platform, SUM(cs.amount)::float as total_spend
      FROM "CampaignSpend" cs
      JOIN "Campaign" c ON cs."campaignId" = c.id
      WHERE cs."startDate" >= ${thirtyDaysAgo}
      GROUP BY c.platform
    `,
    
    // Recent leads count
    prisma.lead.count({
      where: {
        createdAt: { gte: thisMonth },
      },
    }),
    
    // Course statistics
    prisma.course.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        price: true,
        _count: {
          select: {
            leads: {
              where: {
                createdAt: { gte: thirtyDaysAgo },
              },
            },
          },
        },
      },
    }),
    
    // Commercial performance
    prisma.user.findMany({
      where: { role: "COMMERCIAL" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            contactedLeads: {
              where: {
                contactedAt: { gte: thirtyDaysAgo },
              },
            },
            assignedLeads: {
              where: {
                enrolled: true,
                enrolledAt: { gte: thirtyDaysAgo },
              },
            },
          },
        },
      },
    }),
  ]);

  // Calculate derived metrics
  const totalLeads = leadStats._count;
  const enrolledLeads = leadsByStatus.find(s => s.status === "ISCRITTO")?._count || 0;
  const conversionRate = totalLeads > 0 ? ((enrolledLeads / totalLeads) * 100).toFixed(2) : "0";

  // Format spend data
  const spendData = spendByPlatform as { platform: string; total_spend: number }[];
  const totalSpend = spendData.reduce((sum, p) => sum + (p.total_spend || 0), 0);
  const cpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : "N/A";

  return {
    periodo: "Ultimi 30 giorni",
    dataAggiornamento: now.toISOString(),
    
    leadStatistiche: {
      totale: totalLeads,
      perStato: leadsByStatus.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {} as Record<string, number>),
      perPiattaforma: leadsByPlatform,
      questoMese: recentLeads,
      tassoConversione: `${conversionRate}%`,
    },
    
    campagne: {
      attive: campaignStats._count,
    },
    
    spese: {
      totale: totalSpend.toFixed(2),
      perPiattaforma: spendData.reduce((acc, p) => {
        acc[p.platform] = p.total_spend?.toFixed(2) || "0";
        return acc;
      }, {} as Record<string, string>),
      cplMedio: cpl,
    },
    
    corsi: courseStats.map(c => ({
      nome: c.name,
      prezzo: c.price.toString(),
      leadsUltimi30gg: c._count.leads,
    })),
    
    commerciali: commercialStats.map(u => ({
      nome: u.name,
      leadContattati: u._count.contactedLeads,
      iscrizioni: u._count.assignedLeads,
    })),
  };
}
