/**
 * AI Provider Router
 * 
 * Smart routing with automatic fallback when rate limited.
 * Tries models in intelligence-first order, falling back to next model
 * when rate limits are hit.
 */

import { 
  MODELS, 
  PROVIDERS, 
  ModelConfig, 
  ProviderName,
  getProviderApiKey,
  isProviderConfigured,
} from "./config";

// Types
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  minIntelligence?: number;
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface QueryResult {
  content: string;
  model: string;
  provider: ProviderName;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
  };
  latencyMs: number;
  tool_calls?: ToolCall[];
  finish_reason?: "stop" | "tool_calls" | "length";
}

// Rate limit tracking (in-memory, resets on serverless cold start)
// For production, consider using Redis or Vercel KV
interface RateLimitEntry {
  provider: ProviderName;
  model: string;
  blockedUntil: number;
  consecutiveErrors: number;
}

const rateLimitCache = new Map<string, RateLimitEntry>();

/**
 * Check if a model is currently rate limited
 */
function isRateLimited(model: ModelConfig): boolean {
  const key = `${model.provider}:${model.id}`;
  const entry = rateLimitCache.get(key);
  
  if (!entry) return false;
  
  // Check if block period has expired
  if (Date.now() > entry.blockedUntil) {
    rateLimitCache.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Mark a model as rate limited with exponential backoff
 */
function markRateLimited(model: ModelConfig): void {
  const key = `${model.provider}:${model.id}`;
  const existing = rateLimitCache.get(key);
  const consecutiveErrors = (existing?.consecutiveErrors || 0) + 1;
  
  // Exponential backoff: 30s, 1min, 2min, 5min, 10min, 30min, 1hr
  const backoffSeconds = [30, 60, 120, 300, 600, 1800, 3600];
  const backoffIndex = Math.min(consecutiveErrors - 1, backoffSeconds.length - 1);
  const backoffMs = backoffSeconds[backoffIndex] * 1000;
  
  rateLimitCache.set(key, {
    provider: model.provider,
    model: model.id,
    blockedUntil: Date.now() + backoffMs,
    consecutiveErrors,
  });
  
  console.log(`[AI Router] Rate limited ${model.provider}/${model.id} for ${backoffSeconds[backoffIndex]}s (attempt ${consecutiveErrors})`);
}

/**
 * Clear rate limit for a model (on successful request)
 */
function clearRateLimit(model: ModelConfig): void {
  const key = `${model.provider}:${model.id}`;
  rateLimitCache.delete(key);
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("rate_limit") ||
      message.includes("quota") ||
      message.includes("too many requests") ||
      message.includes("429")
    );
  }
  return false;
}

/**
 * Get available models (configured + not rate limited)
 */
function getAvailableModels(minIntelligence: number = 0): ModelConfig[] {
  return MODELS.filter(model => {
    // Check provider is configured
    if (!isProviderConfigured(model.provider)) {
      return false;
    }
    
    // Check intelligence threshold
    if (model.intelligenceScore < minIntelligence) {
      return false;
    }
    
    // Check not rate limited
    if (isRateLimited(model)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Make a chat completion request to a specific provider
 */
async function callProvider(
  model: ModelConfig,
  messages: ChatMessage[],
  options: QueryOptions
): Promise<QueryResult> {
  const provider = PROVIDERS[model.provider];
  const apiKey = getProviderApiKey(model.provider);
  
  if (!apiKey) {
    throw new Error(`No API key configured for ${model.provider}`);
  }
  
  const startTime = Date.now();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
    ...provider.headers,
  };
  
  const body: Record<string, unknown> = {
    model: model.id,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4000,
  };

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? "auto";
  }
  
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  
  const latencyMs = Date.now() - startTime;
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorText;
    } catch {
      errorMessage = errorText;
    }
    
    // Check for rate limit specifically
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded: ${errorMessage}`);
    }
    
    throw new Error(`${model.provider} API error (${response.status}): ${errorMessage}`);
  }
  
  const data = await response.json();
  
  const message = data.choices?.[0]?.message;
  const content = message?.content || "";
  const reasoning = message?.reasoning;
  const tool_calls = message?.tool_calls;
  const finish_reason = data.choices?.[0]?.finish_reason;
  
  return {
    content: reasoning ? `${content}` : content,  // R1 models have reasoning
    model: model.id,
    provider: model.provider,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      reasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens,
    } : undefined,
    latencyMs,
    tool_calls,
    finish_reason,
  };
}

/**
 * Query AI with automatic fallback
 * 
 * Tries models in intelligence-first order, automatically falling back
 * to the next model when rate limited.
 */
export async function queryAI(
  messages: ChatMessage[],
  options: QueryOptions = {}
): Promise<QueryResult> {
  const { minIntelligence = 0 } = options;
  
  const availableModels = getAvailableModels(minIntelligence);
  
  if (availableModels.length === 0) {
    // Check if any providers are configured
    const configuredProviders = [
      isProviderConfigured("openrouter") ? "OpenRouter" : null,
      isProviderConfigured("groq") ? "Groq" : null,
    ].filter(Boolean);
    
    if (configuredProviders.length === 0) {
      throw new Error(
        "No AI providers configured. Please set GROQ_API_KEY or OPENROUTER_API_KEY environment variables."
      );
    }
    
    throw new Error(
      "All AI models are currently rate limited. Please try again in a few minutes."
    );
  }
  
  let lastError: Error | null = null;
  
  for (const model of availableModels) {
    try {
      console.log(`[AI Router] Trying ${model.provider}/${model.id} (score: ${model.intelligenceScore})`);
      
      const result = await callProvider(model, messages, options);
      
      // Success! Clear any rate limit state
      clearRateLimit(model);
      
      console.log(`[AI Router] Success with ${model.provider}/${model.id} in ${result.latencyMs}ms`);
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (isRateLimitError(error)) {
        markRateLimited(model);
        console.log(`[AI Router] Rate limited on ${model.provider}/${model.id}, trying next...`);
        continue;
      }
      
      // For non-rate-limit errors, log and continue to next model
      console.error(`[AI Router] Error with ${model.provider}/${model.id}:`, lastError.message);
      continue;
    }
  }
  
  // All models failed
  throw lastError || new Error("All AI models failed");
}

/**
 * Get the current status of all models
 */
export function getModelsStatus(): Array<{
  model: string;
  provider: ProviderName;
  intelligenceScore: number;
  available: boolean;
  rateLimitedUntil?: Date;
  configured: boolean;
}> {
  return MODELS.map(model => {
    const key = `${model.provider}:${model.id}`;
    const rateLimit = rateLimitCache.get(key);
    const configured = isProviderConfigured(model.provider);
    
    return {
      model: model.id,
      provider: model.provider,
      intelligenceScore: model.intelligenceScore,
      available: configured && !isRateLimited(model),
      rateLimitedUntil: rateLimit?.blockedUntil ? new Date(rateLimit.blockedUntil) : undefined,
      configured,
    };
  });
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitCache.clear();
}

/**
 * Get a summary of rate limit status
 */
export function getRateLimitSummary(): {
  totalModels: number;
  availableModels: number;
  rateLimitedModels: number;
  configuredProviders: ProviderName[];
} {
  const configuredProviders = (["openrouter", "groq"] as ProviderName[]).filter(isProviderConfigured);
  const availableModels = getAvailableModels();
  const rateLimitedCount = MODELS.filter(m => isProviderConfigured(m.provider) && isRateLimited(m)).length;
  
  return {
    totalModels: MODELS.length,
    availableModels: availableModels.length,
    rateLimitedModels: rateLimitedCount,
    configuredProviders,
  };
}
