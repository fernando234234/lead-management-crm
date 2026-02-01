/**
 * AI Providers Module
 * 
 * Multi-provider AI system with intelligent fallback and ReAct tool support.
 * 
 * Usage:
 * ```typescript
 * import { queryAI, getModelsStatus, TOOL_DEFINITIONS, executeTool } from "@/lib/ai-providers";
 * 
 * // Simple query
 * const result = await queryAI([
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "Analyze this data..." }
 * ]);
 * 
 * // With tools (ReAct pattern)
 * const result = await queryAI(messages, {
 *   tools: TOOL_DEFINITIONS,
 *   tool_choice: "auto"
 * });
 * 
 * if (result.tool_calls) {
 *   for (const call of result.tool_calls) {
 *     const toolResult = await executeTool(call.function.name, JSON.parse(call.function.arguments));
 *   }
 * }
 * ```
 */

// Main query function
export { queryAI } from "./router";

// Types
export type { 
  ChatMessage, 
  QueryOptions, 
  QueryResult, 
  ToolCall, 
  ToolDefinition 
} from "./router";

// Status and debugging
export { getModelsStatus, getRateLimitSummary, clearAllRateLimits } from "./router";

// Tools for ReAct pattern
export { TOOL_DEFINITIONS, executeTool } from "./tools";
export type { ToolName, ToolResult } from "./tools";

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
