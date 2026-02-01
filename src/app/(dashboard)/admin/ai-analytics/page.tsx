"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Brain, 
  Sparkles, 
  Send, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  Clock,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
}

interface AIStatus {
  configured: boolean;
  providers: string[];
  availableModels: number;
  rateLimitedModels: number;
}

const EXAMPLE_QUESTIONS = [
  { icon: BarChart3, text: "Qual e il CPL medio per piattaforma questo mese?" },
  { icon: TrendingUp, text: "Confronta le performance tra META e Google Ads" },
  { icon: Users, text: "Quali commerciali hanno le migliori conversioni?" },
  { icon: Zap, text: "Quale campagna ha il miglior ROI negli ultimi 30 giorni?" },
];

export default function AIAnalyticsPage() {
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI status on mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch("/api/codex/query");
      if (response.ok) {
        const data = await response.json();
        setAIStatus(data);
      } else {
        setAIStatus({ configured: false, providers: [], availableModels: 0, rateLimitedModels: 0 });
      }
    } catch (error) {
      console.error("Error checking AI status:", error);
      setAIStatus({ configured: false, providers: [], availableModels: 0, rateLimitedModels: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async (question?: string) => {
    const text = question || input.trim();
    if (!text || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/codex/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Query failed");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        model: data.model,
        provider: data.provider,
        usage: data.usage,
        latencyMs: data.latencyMs,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh status to update rate limit info
      checkAIStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Errore durante la query");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-600" />
            AI Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Analizza i dati del CRM con intelligenza artificiale
          </p>
        </div>
        
        {/* AI Status Badge */}
        <div className="flex items-center gap-3">
          {aiStatus?.configured ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                {aiStatus.availableModels} modelli disponibili
              </span>
              {aiStatus.rateLimitedModels > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                  {aiStatus.rateLimitedModels} in pausa
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                AI non configurato
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            x
          </button>
        </div>
      )}

      {/* Main Content */}
      {!aiStatus?.configured ? (
        /* Not Configured State */
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-2xl p-8">
          <div className="max-w-xl mx-auto text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-200">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              AI Analytics non configurato
            </h2>
            <p className="text-gray-600 mb-6">
              Per utilizzare AI Analytics, e necessario configurare almeno un provider AI.
              Contatta l'amministratore di sistema per aggiungere le chiavi API.
            </p>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-left text-sm">
              <p className="font-medium text-gray-900 mb-2">Variabili d'ambiente necessarie:</p>
              <code className="block bg-gray-100 rounded p-2 text-xs font-mono text-gray-700">
                GROQ_API_KEY=gsk_...<br/>
                OPENROUTER_API_KEY=sk-or-...
              </code>
              <p className="text-gray-500 mt-2 text-xs">
                Basta configurare uno dei due provider. Groq e gratuito con limiti, OpenRouter ha modelli gratuiti.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Chat Interface */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              /* Empty State with Examples */
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cosa vuoi analizzare?
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Fai domande sui dati del CRM in linguaggio naturale. 
                  L'AI analizzer lead, campagne, spese e performance.
                </p>
                
                {/* Example Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {EXAMPLE_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q.text)}
                      disabled={isSending}
                      className={cn(
                        "flex items-center gap-2 p-3 text-left text-sm",
                        "bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200",
                        "rounded-xl transition-colors",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <q.icon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      <span className="text-gray-700">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Messages */
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    {/* Metadata for assistant messages */}
                    {message.role === "assistant" && (message.model || message.usage) && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex flex-wrap gap-3 text-xs text-gray-500">
                        {message.model && (
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {message.model.split("/").pop()?.replace(":free", "")}
                          </span>
                        )}
                        {message.latencyMs && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {(message.latencyMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {message.usage && (
                          <span>
                            {message.usage.totalTokens.toLocaleString()} token
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Loading Indicator */}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="text-sm text-gray-500">Elaborazione...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Fai una domanda sui dati del CRM..."
                  rows={1}
                  className={cn(
                    "w-full resize-none rounded-xl border border-gray-300 px-4 py-3",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                    "placeholder:text-gray-400 text-sm",
                    "disabled:bg-gray-100 disabled:cursor-not-allowed"
                  )}
                  disabled={isSending}
                />
              </div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isSending}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
                  "bg-purple-600 text-white hover:bg-purple-700",
                  "disabled:bg-gray-300 disabled:cursor-not-allowed"
                )}
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              <Lightbulb className="h-3 w-3 inline-block mr-1" />
              Premi Invio per inviare, Shift+Invio per andare a capo
            </p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Come funziona</p>
            <p className="text-blue-600">
              AI Analytics utilizza modelli AI avanzati (DeepSeek R1, Kimi K2, Llama 3) per analizzare i dati del CRM.
              Il sistema seleziona automaticamente il modello piu intelligente disponibile e passa al successivo in caso di limiti.
              I dati vengono aggregati e anonimizzati prima dell'analisi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
