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

// System prompt for ReAct pattern
const SYSTEM_PROMPT = `Sei un assistente AI per un CRM di gestione lead di Job Formazione, un'azienda di formazione italiana.

HAI ACCESSO A STRUMENTI (TOOLS) per recuperare dati specifici dal database. USALI!

STRUMENTI DISPONIBILI:
- get_lead_stats: Statistiche lead (conteggi, stati, piattaforme, conversioni)
- get_spend_data: Dati spesa pubblicitaria (spesa, CPL per piattaforma)
- get_revenue_data: Dati ricavi da iscrizioni (ricavi, ROI, profitto)
- get_call_analytics: Analisi chiamate (orari migliori, esiti, pattern)
- get_campaigns: Lista campagne con metriche
- get_commercials_performance: Performance commerciali
- get_trends: Trend storici (lead, spesa, iscrizioni nel tempo)
- get_recent_leads: Lead recenti individuali
- get_courses: Lista corsi con prezzi

ISTRUZIONI:
1. Analizza la domanda dell'utente
2. Decidi quali dati ti servono
3. Usa gli strumenti appropriati con le date corrette
4. Analizza i risultati e rispondi
5. Se servono altri dati, chiama altri strumenti

FORMATO DATE: Usa sempre ISO format (YYYY-MM-DD)
- "questo mese" → primo e ultimo giorno del mese corrente
- "ultimi 30 giorni" → da 30 giorni fa a oggi
- "gennaio" → 2026-01-01 a 2026-01-31
- "ultimo trimestre" → ultimi 3 mesi

RISPOSTE:
- Sempre in italiano
- Usa formattazione chiara (elenchi, numeri formattati)
- Sii preciso con i calcoli (ROI, CPL, tassi)
- Se i dati non bastano, dillo chiaramente

OGGI: ${new Date().toISOString().split('T')[0]}
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
