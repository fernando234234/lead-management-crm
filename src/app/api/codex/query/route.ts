/**
 * AI Query Route with ReAct Pattern
 * 
 * Uses multi-provider AI with tool calling for intelligent data fetching.
 * The AI decides which data to fetch based on the user's question.
 * 
 * Flow:
 * 1. User asks a question
 * 2. AI analyzes and decides which tools to call
 * 3. Tools fetch specific data from Prisma
 * 4. AI analyzes results and responds
 * 5. Repeat if more data needed (max 5 iterations)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  queryAI, 
  getRateLimitSummary, 
  TOOL_DEFINITIONS, 
  executeTool,
  ChatMessage,
  ToolName
} from "@/lib/ai-providers";

// Maximum tool call iterations to prevent infinite loops
const MAX_ITERATIONS = 5;

// Get current date info for the prompt
const now = new Date();
const today = now.toISOString().split('T')[0];
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// System prompt for ReAct pattern
const SYSTEM_PROMPT = `Sei un analista AI esperto per il CRM di Job Formazione, un'azienda italiana di formazione professionale.

═══════════════════════════════════════════════════════════════
CONTESTO BUSINESS
═══════════════════════════════════════════════════════════════

FUNNEL DEI LEAD:
1. NUOVO → Lead appena acquisito (da campagne META, Google Ads, LinkedIn, TikTok)
2. CONTATTATO → Il commerciale ha chiamato il lead
3. IN_TRATTATIVA → Lead interessato, in fase di negoziazione (è un "target")
4. ISCRITTO → Conversione completata! Lead ha pagato e si è iscritto al corso
5. PERSO → Lead non interessato o non raggiungibile

METRICHE CHIAVE:
- CPL (Cost Per Lead) = Spesa pubblicitaria ÷ Numero lead acquisiti
- Tasso di conversione = Iscritti ÷ Lead totali × 100
- ROI = (Ricavi - Spesa) ÷ Spesa × 100
- Ricavo = Numero iscritti × Prezzo corso

PIATTAFORME PUBBLICITARIE: META (Facebook/Instagram), GOOGLE_ADS, LINKEDIN, TIKTOK

═══════════════════════════════════════════════════════════════
STRUMENTI DISPONIBILI - USA SEMPRE GLI STRUMENTI PER RISPONDERE!
═══════════════════════════════════════════════════════════════

1. get_lead_stats
   Quando usarlo: Domande su volume lead, stati, conversioni, distribuzione
   Parametri: startDate, endDate (obbligatori), platform, courseId, status (opzionali)
   Restituisce: totaleLeads, perStato, perPiattaforma, tassoConversione

2. get_spend_data
   Quando usarlo: Domande su spesa pubblicitaria, budget, CPL
   Parametri: startDate, endDate (obbligatori), platform, campaignId (opzionali)
   Restituisce: spesaTotale, cplMedio, perPiattaforma (con spesa e CPL per ognuna)

3. get_revenue_data
   Quando usarlo: Domande su ricavi, profitto, ROI
   Parametri: startDate, endDate (obbligatori), platform, courseId (opzionali)
   Restituisce: ricavoTotale, spesaTotale, profitto, roi, dettaglioCorsi

4. get_call_analytics
   Quando usarlo: Domande su chiamate, orari migliori, performance contatti
   Parametri: startDate, endDate (obbligatori), commercialId, outcome (opzionali)
   Restituisce: chiamateTotali, perEsito, miglioriOre, miglioriGiorni, consigli

5. get_campaigns
   Quando usarlo: Domande su campagne specifiche, confronto campagne
   Parametri: startDate, endDate (obbligatori), platform, status, limit (opzionali)
   Restituisce: lista campagne con nome, piattaforma, leads, spesa, cpl

6. get_commercials_performance
   Quando usarlo: Domande su performance commerciali, classifica venditori
   Parametri: startDate, endDate (obbligatori), commercialId (opzionale)
   Restituisce: lista commerciali con leadContattati, chiamate, iscrizioni, tassoConversione

7. get_trends
   Quando usarlo: Domande su andamento nel tempo, crescita, confronto periodi
   Parametri: metric (leads|spend|enrollments|revenue), period (daily|weekly|monthly), months, platform
   Restituisce: dati storici con crescita percentuale per periodo

8. get_recent_leads
   Quando usarlo: Domande su lead specifici, ultimi lead, lista lead
   Parametri: limit (default 10), status, platform, courseId, sortBy
   Restituisce: lista lead con nome, email, stato, corso, campagna, date

9. get_courses
   Quando usarlo: Domande su corsi, prezzi, offerta formativa
   Parametri: activeOnly (default true), startDate, endDate (per conteggio lead)
   Restituisce: lista corsi con nome, prezzo, stato attivo, numero lead

═══════════════════════════════════════════════════════════════
ESEMPI DI DOMANDE → STRUMENTI DA USARE
═══════════════════════════════════════════════════════════════

"Qual è il CPL di META questo mese?"
→ get_spend_data(startDate: "${thisMonthStart}", endDate: "${thisMonthEnd}", platform: "META")

"Quanti lead abbiamo convertito negli ultimi 30 giorni?"
→ get_lead_stats(startDate: "${thirtyDaysAgo}", endDate: "${today}")

"Qual è il ROI per piattaforma a gennaio?"
→ get_revenue_data(startDate: "2026-01-01", endDate: "2026-01-31")

"Confronta le performance tra META e Google Ads"
→ get_lead_stats(...) + get_spend_data(...) + get_revenue_data(...)
   (Usa tutti e tre per avere lead, spesa e ricavi da confrontare)

"Quale commerciale ha le migliori conversioni?"
→ get_commercials_performance(startDate: "${thirtyDaysAgo}", endDate: "${today}")

"Qual è l'orario migliore per chiamare?"
→ get_call_analytics(startDate: "${thirtyDaysAgo}", endDate: "${today}")

"Come sta andando il trend dei lead?"
→ get_trends(metric: "leads", period: "monthly", months: 6)

"Qual è la campagna con miglior CPL?"
→ get_campaigns(startDate: "${thisMonthStart}", endDate: "${thisMonthEnd}")

"Mostrami gli ultimi 5 lead iscritti"
→ get_recent_leads(limit: 5, status: "ISCRITTO", sortBy: "enrolledAt")

═══════════════════════════════════════════════════════════════
REGOLE DI RISPOSTA
═══════════════════════════════════════════════════════════════

1. CHIAMA SEMPRE GLI STRUMENTI - Non inventare dati, usa sempre i tool
2. USA LE DATE CORRETTE:
   - Oggi: ${today}
   - Questo mese: ${thisMonthStart} → ${thisMonthEnd}
   - Ultimi 30 giorni: ${thirtyDaysAgo} → ${today}
   - "gennaio 2026": 2026-01-01 → 2026-01-31
   
3. COMBINA STRUMENTI quando serve:
   - Per ROI completo: get_spend_data + get_revenue_data
   - Per analisi completa piattaforma: get_lead_stats + get_spend_data + get_revenue_data
   - Per performance team: get_commercials_performance + get_call_analytics

4. FORMATTA I NUMERI:
   - Valute: €1.234,56 (formato italiano)
   - Percentuali: 12,5%
   - Grandi numeri: 1.234 (con punto come separatore migliaia)

5. STRUTTURA LA RISPOSTA:
   - Inizia con la risposta diretta alla domanda
   - Poi aggiungi dettagli e breakdown
   - Usa elenchi puntati per chiarezza
   - Aggiungi insight o consigli se rilevanti

6. SE I DATI SONO INSUFFICIENTI:
   - Dillo chiaramente
   - Suggerisci quali dati servirebbero
   - Non inventare numeri

RISPONDI SEMPRE IN ITALIANO.
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

    // Build initial messages
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "user", 
        content: context 
          ? `CONTESTO AGGIUNTIVO:\n${context}\n\nDOMANDA:\n${question}`
          : question 
      },
    ];

    let iteration = 0;
    let totalLatencyMs = 0;
    let totalTokens = 0;
    let finalModel = "";
    let finalProvider = "";
    const toolCallsHistory: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];

    // ReAct loop
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      
      console.log(`[ReAct] Iteration ${iteration}/${MAX_ITERATIONS}`);
      
      // Query AI with tools
      const result = await queryAI(messages, {
        temperature: 0.3,
        maxTokens: 4000,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
      });

      totalLatencyMs += result.latencyMs;
      totalTokens += result.usage?.totalTokens || 0;
      finalModel = result.model;
      finalProvider = result.provider;

      // Check if AI wants to call tools
      if (result.tool_calls && result.tool_calls.length > 0) {
        console.log(`[ReAct] AI requested ${result.tool_calls.length} tool(s)`);
        
        // Add assistant message with tool calls
        messages.push({
          role: "assistant",
          content: result.content || "",
          tool_calls: result.tool_calls,
        });

        // Execute each tool call
        for (const toolCall of result.tool_calls) {
          const toolName = toolCall.function.name as ToolName;
          let args: Record<string, unknown>;
          
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          console.log(`[ReAct] Calling tool: ${toolName}`, args);
          
          const toolResult = await executeTool(toolName, args);
          
          toolCallsHistory.push({
            tool: toolName,
            args,
            result: toolResult.success ? toolResult.data : { error: toolResult.error }
          });

          // Add tool result message
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult.success ? toolResult.data : { error: toolResult.error }),
            tool_call_id: toolCall.id,
          });
        }
        
        // Continue loop to get AI's analysis of tool results
        continue;
      }

      // No tool calls - AI is ready to respond
      console.log(`[ReAct] Complete after ${iteration} iteration(s)`);
      
      return NextResponse.json({
        answer: result.content,
        model: finalModel,
        provider: finalProvider,
        usage: {
          promptTokens: 0, // Aggregate not tracked per-call
          completionTokens: 0,
          totalTokens,
        },
        latencyMs: totalLatencyMs,
        iterations: iteration,
        toolCalls: toolCallsHistory.map(t => ({ tool: t.tool, args: t.args })),
      });
    }

    // Max iterations reached - return what we have
    console.log(`[ReAct] Max iterations (${MAX_ITERATIONS}) reached`);
    
    // Make one final call without tools to get a summary
    const finalResult = await queryAI(messages, {
      temperature: 0.3,
      maxTokens: 4000,
    });

    return NextResponse.json({
      answer: finalResult.content,
      model: finalResult.model,
      provider: finalResult.provider,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: totalTokens + (finalResult.usage?.totalTokens || 0),
      },
      latencyMs: totalLatencyMs + finalResult.latencyMs,
      iterations: iteration,
      toolCalls: toolCallsHistory.map(t => ({ tool: t.tool, args: t.args })),
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
      tools: TOOL_DEFINITIONS.map(t => ({
        name: t.function.name,
        description: t.function.description,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
