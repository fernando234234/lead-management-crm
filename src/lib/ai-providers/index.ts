/**
 * AI Providers Module
 * 
 * Multi-provider AI system with intelligent fallback.
 * 
 * Usage:
 * ```typescript
 * import { queryAI, getModelsStatus } from "@/lib/ai-providers";
 * 
 * const result = await queryAI([
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "Analyze this data..." }
 * ]);
 * 
 * console.log(result.content);
 * console.log(`Used ${result.model} on ${result.provider}`);
 * ```
 */

// Main query function
export { queryAI } from "./router";

// Types
export type { ChatMessage, QueryOptions, QueryResult } from "./router";

// Status and debugging
export { getModelsStatus, getRateLimitSummary, clearAllRateLimits } from "./router";

// Configuration (for advanced usage)
export {
  MODELS,
  PROVIDERS,
  getModelById,
  getModelsByProvider,
  getModelsAboveScore,
  getProviderApiKey,
  isProviderConfigured,
  getConfiguredProviders,
} from "./config";

export type { ModelConfig, ProviderConfig, ProviderName } from "./config";
