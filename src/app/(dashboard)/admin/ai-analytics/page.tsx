"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Brain, 
  Sparkles, 
  Send, 
  Loader2, 
  Link2, 
  Unlink, 
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ConnectionStatus {
  connected: boolean;
  email?: string;
  planType?: string;
  expiresAt?: string;
}

interface DeviceCodeState {
  sessionId: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: number;
}

const EXAMPLE_QUESTIONS = [
  { icon: BarChart3, text: "Qual è il CPL medio per piattaforma questo mese?" },
  { icon: TrendingUp, text: "Confronta le performance tra META e Google Ads" },
  { icon: Users, text: "Quali commerciali hanno le migliori conversioni?" },
  { icon: Zap, text: "Quale campagna ha il miglior ROI negli ultimi 30 giorni?" },
];

export default function AIAnalyticsPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Device Code Flow state
  const [deviceCode, setDeviceCode] = useState<DeviceCodeState | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch("/api/codex/auth");
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling for device code completion
  const startPolling = useCallback((sessionId: string) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/codex/auth/callback?sessionId=${sessionId}`);
        const data = await response.json();

        if (data.status === "complete") {
          // Success!
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setDeviceCode(null);
          setIsConnecting(false);
          setConnectionStatus({
            connected: true,
            email: data.email,
            planType: data.planType,
          });
        } else if (data.status === "expired") {
          // Session expired
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setDeviceCode(null);
          setIsConnecting(false);
          setError("La sessione è scaduta. Riprova.");
        }
        // If still pending, continue polling
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll every 5 seconds
    pollingRef.current = setInterval(poll, 5000);
    // Also poll immediately
    poll();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/codex/auth", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to start authentication");
      }
      
      const data = await response.json();
      
      // Set device code state
      setDeviceCode({
        sessionId: data.sessionId,
        userCode: data.userCode,
        verificationUrl: data.verificationUrl,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
      
      // Start polling for completion
      startPolling(data.sessionId);
    } catch (err) {
      setError("Impossibile avviare la connessione");
      setIsConnecting(false);
    }
  };

  const handleCancelConnect = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    
    if (deviceCode) {
      // Cancel the session on the server
      try {
        await fetch(`/api/codex/auth/callback?sessionId=${deviceCode.sessionId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("Error cancelling session:", err);
      }
    }
    
    setDeviceCode(null);
    setIsConnecting(false);
  };

  const handleCopyCode = () => {
    if (deviceCode) {
      navigator.clipboard.writeText(deviceCode.userCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/codex/auth", { method: "DELETE" });
      if (response.ok) {
        setConnectionStatus({ connected: false });
        setMessages([]);
      }
    } catch (error) {
      setError("Impossibile disconnettere l'account");
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
        usage: data.usage,
      };

      setMessages(prev => [...prev, assistantMessage]);
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
        
        {/* Connection Status */}
        <div className="flex items-center gap-3">
          {connectionStatus?.connected ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  {connectionStatus.email || "Connesso"}
                </span>
                {connectionStatus.planType && connectionStatus.planType !== "unknown" && (
                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    {connectionStatus.planType}
                  </span>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Unlink className="h-4 w-4" />
                Disconnetti
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                "hover:from-purple-700 hover:to-indigo-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Connetti ChatGPT
            </button>
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
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      {!connectionStatus?.connected ? (
        /* Not Connected State */
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-8">
          <div className="max-w-xl mx-auto text-center">
            {/* Device Code Flow - Showing user code */}
            {deviceCode ? (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200 animate-pulse">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Completa l'autenticazione
                </h2>
                <p className="text-gray-600 mb-6">
                  Visita il sito OpenAI e inserisci questo codice per collegare il tuo account ChatGPT:
                </p>
                
                {/* User Code Display */}
                <div className="bg-white border-2 border-purple-200 rounded-xl p-6 mb-6 shadow-sm">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-4xl font-mono font-bold tracking-widest text-purple-700">
                      {deviceCode.userCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        codeCopied 
                          ? "bg-green-100 text-green-600" 
                          : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                      )}
                      title="Copia codice"
                    >
                      {codeCopied ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  <a
                    href={deviceCode.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all",
                      "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                      "hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apri {deviceCode.verificationUrl}
                  </a>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <span>In attesa dell'autenticazione...</span>
                </div>

                <button
                  onClick={handleCancelConnect}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  Annulla
                </button>
              </>
            ) : (
              /* Initial Connect State */
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  Connetti il tuo account ChatGPT
                </h2>
                <p className="text-gray-600 mb-6">
                  Per utilizzare AI Analytics, connetti il tuo abbonamento ChatGPT (Plus, Pro o Enterprise).
                  L'utilizzo viene addebitato sul tuo abbonamento personale.
                </p>
                <div className="flex flex-col gap-3 text-sm text-gray-500 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Analisi dati in linguaggio naturale</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Il tuo abbonamento, i tuoi dati</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Nessun costo aggiuntivo per Job Formazione</span>
                  </div>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className={cn(
                    "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                    "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                    "hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-purple-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Link2 className="h-5 w-5" />
                  )}
                  Connetti ChatGPT
                </button>
              </>
            )}
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
                  L'AI analizzerà lead, campagne, spese e performance.
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
                    {message.usage && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500">
                        Token: {message.usage.totalTokens.toLocaleString()}
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
            <AlertCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Come funziona</p>
            <p className="text-blue-600">
              AI Analytics utilizza il tuo abbonamento ChatGPT personale per analizzare i dati del CRM.
              I dati vengono aggregati e anonimizzati prima di essere inviati all'AI.
              L'utilizzo viene conteggiato sul tuo piano ChatGPT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
