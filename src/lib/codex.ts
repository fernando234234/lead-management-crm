/**
 * OpenAI API Key Integration Helper
 * 
 * This module handles API key storage and API calls to OpenAI
 * using each user's own API key.
 * 
 * Each admin provides their own OpenAI API key which is stored
 * encrypted in the database. Usage is billed to their account.
 */

import { prisma } from "./prisma";
import crypto from "crypto";

// OpenAI API Configuration
export const OPENAI_API_CONFIG = {
  baseUrl: "https://api.openai.com/v1",
  chatCompletionsEndpoint: "https://api.openai.com/v1/chat/completions",
  modelsEndpoint: "https://api.openai.com/v1/models",
};

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.OPENAI_TOKEN_ENCRYPTION_KEY || "default-key-change-in-production";

/**
 * Encrypt a string value for secure storage
 */
export function encrypt(text: string): string {
  const algorithm = "aes-256-cbc";
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a string value from storage
 */
export function decrypt(encryptedText: string): string {
  const algorithm = "aes-256-cbc";
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Validate an OpenAI API key by making a test request
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(OPENAI_API_CONFIG.modelsEndpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const error = await response.json();
    return {
      valid: false,
      error: error.error?.message || `API returned ${response.status}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Store an API key for a user (encrypted)
 */
export async function storeApiKey(
  userId: string,
  apiKey: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiAccessToken: encrypt(apiKey),
      // Clear any old OAuth fields
      openaiRefreshToken: null,
      openaiIdToken: null,
      openaiTokenExpiresAt: null,
      openaiAccountEmail: null,
      openaiPlanType: "api_key",
    },
  });
}

/**
 * Get the stored API key for a user
 */
export async function getApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openaiAccessToken: true,
    },
  });

  if (!user?.openaiAccessToken) {
    return null;
  }

  return decrypt(user.openaiAccessToken);
}

/**
 * Check if a user has connected their OpenAI account
 */
export async function isUserConnected(userId: string): Promise<{
  connected: boolean;
  planType?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openaiAccessToken: true,
      openaiPlanType: true,
    },
  });

  return {
    connected: !!user?.openaiAccessToken,
    planType: user?.openaiPlanType || undefined,
  };
}

/**
 * Disconnect a user's OpenAI account (remove API key)
 */
export async function disconnectUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiAccessToken: null,
      openaiRefreshToken: null,
      openaiIdToken: null,
      openaiTokenExpiresAt: null,
      openaiAccountEmail: null,
      openaiPlanType: null,
    },
  });
}

// ============================================================================
// CHAT COMPLETION
// ============================================================================

/**
 * Make a chat completion request using the user's API key
 */
export async function chatCompletion(
  apiKey: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const response = await fetch(OPENAI_API_CONFIG.chatCompletionsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || "gpt-4o",
      messages: messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Chat completion failed");
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || "",
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Get a valid API key for a user (alias for getApiKey for compatibility)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  return getApiKey(userId);
}
