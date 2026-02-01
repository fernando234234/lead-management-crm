/**
 * AI Provider Configuration
 * 
 * Multi-provider setup with intelligence-first priority ordering.
 * Supports OpenRouter (free models) and Groq (free tier with rate limits).
 * 
 * Priority: R1 -> Chimeras -> Kimi (Groq) -> Kimi (Free) -> Rest
 */

export type ProviderName = "openrouter" | "groq";

export interface ModelConfig {
  id: string;
  provider: ProviderName;
  intelligenceScore: number;
  contextWindow: number;
  description: string;
  // Rate limits (for Groq free tier)
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
    tokensPerMinute: number;
  };
}

export interface ProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKeyEnvVar: string;
  headers?: Record<string, string>;
}

// Provider configurations
export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  openrouter: {
    name: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://lead-management-crm.vercel.app",
      "X-Title": "Job Formazione CRM",
    },
  },
  groq: {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnvVar: "GROQ_API_KEY",
  },
};

/**
 * Models ordered by intelligence (highest first)
 * 
 * Priority: R1 -> Chimeras -> Kimi (Groq) -> Kimi (Free) -> 405B -> GPT-OSS -> 70B -> smaller
 */
export const MODELS: ModelConfig[] = [
  // === TIER 1: DeepSeek R1 (O1-level reasoning) ===
  {
    id: "deepseek/deepseek-r1-0528:free",
    provider: "openrouter",
    intelligenceScore: 99,
    contextWindow: 163840,
    description: "DeepSeek R1 - O1-level reasoning, open source",
  },
  
  // === TIER 2: Chimeras (R1 merged variants) ===
  {
    id: "tngtech/deepseek-r1t2-chimera:free",
    provider: "openrouter",
    intelligenceScore: 97,
    contextWindow: 163840,
    description: "TNG R1T2 Chimera - 2nd gen R1+V3 merge",
  },
  {
    id: "tngtech/deepseek-r1t-chimera:free",
    provider: "openrouter",
    intelligenceScore: 96,
    contextWindow: 163840,
    description: "TNG R1T Chimera - R1+V3 merged for efficiency",
  },
  {
    id: "tngtech/tng-r1t-chimera:free",
    provider: "openrouter",
    intelligenceScore: 95,
    contextWindow: 163840,
    description: "TNG R1T Chimera - Creative variant",
  },
  
  // === TIER 3: Kimi K2 on Groq (fast + smart) ===
  {
    id: "moonshotai/kimi-k2-instruct-0905",
    provider: "groq",
    intelligenceScore: 92,
    contextWindow: 262144,
    description: "Kimi K2 0905 - 1T params, 262K context, on Groq",
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      tokensPerMinute: 10000,
    },
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    provider: "groq",
    intelligenceScore: 91,
    contextWindow: 131072,
    description: "Kimi K2 Instruct - 1T params on Groq",
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      tokensPerMinute: 10000,
    },
  },
  
  // === TIER 4: Kimi K2 Free on OpenRouter ===
  {
    id: "moonshotai/kimi-k2:free",
    provider: "openrouter",
    intelligenceScore: 90,
    contextWindow: 32768,
    description: "Kimi K2 - 1T params, free on OpenRouter",
  },
  
  // === TIER 5: Other strong models ===
  {
    id: "meta-llama/llama-3.1-405b-instruct:free",
    provider: "openrouter",
    intelligenceScore: 88,
    contextWindow: 131072,
    description: "Llama 3.1 405B - Largest open model",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    provider: "openrouter",
    intelligenceScore: 87,
    contextWindow: 131072,
    description: "Hermes 3 405B - Advanced agentic capabilities",
  },
  {
    id: "qwen/qwen3-coder:free",
    provider: "openrouter",
    intelligenceScore: 86,
    contextWindow: 262000,
    description: "Qwen3 Coder 480B - Code-optimized MoE",
  },
  {
    id: "arcee-ai/trinity-large-preview:free",
    provider: "openrouter",
    intelligenceScore: 85,
    contextWindow: 131000,
    description: "Arcee Trinity - 400B MoE, agent-optimized",
  },
  {
    id: "openai/gpt-oss-120b:free",
    provider: "openrouter",
    intelligenceScore: 84,
    contextWindow: 131072,
    description: "OpenAI GPT-OSS 120B - Free on OpenRouter",
  },
  {
    id: "openai/gpt-oss-120b",
    provider: "groq",
    intelligenceScore: 84,
    contextWindow: 131072,
    description: "OpenAI GPT-OSS 120B - Fast on Groq",
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      tokensPerMinute: 8000,
    },
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    provider: "openrouter",
    intelligenceScore: 82,
    contextWindow: 262144,
    description: "Qwen3 Next 80B - Fast, no thinking delay",
  },
  
  // === TIER 6: Reliable fallbacks ===
  {
    id: "llama-3.3-70b-versatile",
    provider: "groq",
    intelligenceScore: 80,
    contextWindow: 131072,
    description: "Llama 3.3 70B - Reliable workhorse on Groq",
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      tokensPerMinute: 12000,
    },
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    provider: "openrouter",
    intelligenceScore: 80,
    contextWindow: 131072,
    description: "Llama 3.3 70B - Free on OpenRouter",
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    provider: "groq",
    intelligenceScore: 78,
    contextWindow: 131072,
    description: "Llama 4 Maverick - New generation on Groq",
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      tokensPerMinute: 6000,
    },
  },
  {
    id: "qwen/qwen3-32b",
    provider: "groq",
    intelligenceScore: 74,
    contextWindow: 131072,
    description: "Qwen3 32B - Good all-rounder on Groq",
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 1000,
      tokensPerMinute: 6000,
    },
  },
  {
    id: "google/gemma-3-27b-it:free",
    provider: "openrouter",
    intelligenceScore: 72,
    contextWindow: 131072,
    description: "Gemma 3 27B - Multimodal capable",
  },
  
  // === TIER 7: Fast fallbacks ===
  {
    id: "openai/gpt-oss-20b",
    provider: "groq",
    intelligenceScore: 65,
    contextWindow: 131072,
    description: "OpenAI GPT-OSS 20B - Smaller but fast",
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      tokensPerMinute: 8000,
    },
  },
  {
    id: "llama-3.1-8b-instant",
    provider: "groq",
    intelligenceScore: 60,
    contextWindow: 131072,
    description: "Llama 3.1 8B - Very fast, high RPD limit",
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 14400,  // 14.4K RPD - highest limit!
      tokensPerMinute: 6000,
    },
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    provider: "openrouter",
    intelligenceScore: 45,
    contextWindow: 131072,
    description: "Llama 3.2 3B - Last resort, very fast",
  },
];

/**
 * Get a model by ID
 */
export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find(m => m.id === id);
}

/**
 * Get all models for a provider
 */
export function getModelsByProvider(provider: ProviderName): ModelConfig[] {
  return MODELS.filter(m => m.provider === provider);
}

/**
 * Get models above a minimum intelligence score
 */
export function getModelsAboveScore(minScore: number): ModelConfig[] {
  return MODELS.filter(m => m.intelligenceScore >= minScore);
}

/**
 * Get the API key for a provider from environment variables
 */
export function getProviderApiKey(provider: ProviderName): string | undefined {
  const config = PROVIDERS[provider];
  return process.env[config.apiKeyEnvVar];
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(provider: ProviderName): boolean {
  return !!getProviderApiKey(provider);
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ProviderName[] {
  return (Object.keys(PROVIDERS) as ProviderName[]).filter(isProviderConfigured);
}
