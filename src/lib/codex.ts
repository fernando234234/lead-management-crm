/**
 * OpenAI Codex Integration Helper
 * 
 * This module handles OAuth authentication with ChatGPT and API calls
 * using each user's own subscription (Plus/Pro/Enterprise).
 * 
 * Uses Device Code Flow for web app compatibility:
 * 1. Request user code from OpenAI
 * 2. User visits verification URL and enters code
 * 3. Poll for completion
 * 4. Exchange for access/refresh tokens
 * 
 * Based on OpenAI Codex App Server protocol:
 * - OAuth client_id: app_EMoamEEZ73f0CkXaXp7hrann
 * - Device auth endpoint: https://auth.openai.com/api/accounts/deviceauth/usercode
 * - Token refresh URL: https://auth.openai.com/oauth/token
 */

import { prisma } from "./prisma";
import crypto from "crypto";

// OpenAI OAuth Configuration
export const OPENAI_OAUTH_CONFIG = {
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  // Device Code Flow endpoints
  deviceCodeEndpoint: "https://auth.openai.com/api/accounts/deviceauth/usercode",
  deviceTokenEndpoint: "https://auth.openai.com/api/accounts/deviceauth/token",
  tokenEndpoint: "https://auth.openai.com/oauth/token",
  // Verification URL where users enter the code
  verificationUrl: "https://auth.openai.com/codex/device",
  // Callback URI for device auth token exchange
  deviceCallbackUri: "https://auth.openai.com/deviceauth/callback",
  // Legacy - kept for compatibility but not used in device code flow
  authorizationEndpoint: "https://auth.openai.com/authorize",
  scopes: ["openid", "profile", "email", "offline_access", "model.read", "model.request"],
};

// Encryption key from environment (should be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.OPENAI_TOKEN_ENCRYPTION_KEY || "default-key-change-in-production";

// In-memory store for pending device code sessions (serverless-safe with short TTL)
// In production, consider using Redis or database for multi-instance support
interface DeviceCodeSession {
  deviceAuthId: string;
  userCode: string;
  userId: string;
  createdAt: number;
  interval: number;
  expiresAt: number;
}

const pendingDeviceCodes = new Map<string, DeviceCodeSession>();

// Clean up expired sessions periodically
function cleanupExpiredSessions() {
  const now = Date.now();
  Array.from(pendingDeviceCodes.entries()).forEach(([sessionId, session]) => {
    if (now > session.expiresAt) {
      pendingDeviceCodes.delete(sessionId);
    }
  });
}

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
// DEVICE CODE FLOW - For web app OAuth (works on Vercel)
// ============================================================================

/**
 * Request a device code from OpenAI
 * Returns a session ID and user code that the user must enter at the verification URL
 */
export async function requestDeviceCode(userId: string): Promise<{
  sessionId: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}> {
  // Clean up old sessions first
  cleanupExpiredSessions();

  const response = await fetch(OPENAI_OAUTH_CONFIG.deviceCodeEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: OPENAI_OAUTH_CONFIG.clientId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Device code request failed:", response.status, error);
    throw new Error(`Failed to request device code: ${response.status}`);
  }

  const data = await response.json();
  
  // Response format: { device_auth_id, user_code, interval }
  const sessionId = crypto.randomBytes(16).toString("hex");
  const expiresIn = 900; // 15 minutes (OpenAI default)
  
  // Store the session
  const session: DeviceCodeSession = {
    deviceAuthId: data.device_auth_id,
    userCode: data.user_code,
    userId,
    createdAt: Date.now(),
    interval: parseInt(data.interval) || 5,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  
  pendingDeviceCodes.set(sessionId, session);
  
  return {
    sessionId,
    userCode: data.user_code,
    verificationUrl: OPENAI_OAUTH_CONFIG.verificationUrl,
    expiresIn,
    interval: session.interval,
  };
}

/**
 * Get a pending device code session
 */
export function getDeviceCodeSession(sessionId: string): DeviceCodeSession | null {
  cleanupExpiredSessions();
  return pendingDeviceCodes.get(sessionId) || null;
}

/**
 * Poll for device code completion
 * Returns null if still pending, throws if expired/failed
 */
export async function pollDeviceCode(sessionId: string): Promise<{
  status: "pending" | "complete" | "expired";
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn: number;
  };
  accountInfo?: {
    email?: string;
    planType?: string;
  };
} | null> {
  const session = pendingDeviceCodes.get(sessionId);
  
  if (!session) {
    return { status: "expired" };
  }
  
  // Check if session expired
  if (Date.now() > session.expiresAt) {
    pendingDeviceCodes.delete(sessionId);
    return { status: "expired" };
  }
  
  try {
    // Poll the device token endpoint
    const response = await fetch(OPENAI_OAUTH_CONFIG.deviceTokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_auth_id: session.deviceAuthId,
        user_code: session.userCode,
      }),
    });
    
    // 403/404 means user hasn't completed auth yet
    if (response.status === 403 || response.status === 404) {
      return { status: "pending" };
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error("Device token poll failed:", response.status, error);
      
      // Check for specific error conditions
      if (response.status === 400) {
        pendingDeviceCodes.delete(sessionId);
        return { status: "expired" };
      }
      
      return { status: "pending" };
    }
    
    // Success! We got the authorization code
    const data = await response.json();
    
    // Response: { authorization_code, code_challenge, code_verifier }
    const authCode = data.authorization_code;
    const codeVerifier = data.code_verifier;
    
    // Exchange for tokens
    const tokens = await exchangeDeviceCodeForTokens(authCode, codeVerifier);
    
    // Extract account info from id_token if available
    const accountInfo = extractAccountInfo(tokens.idToken);
    
    // Store tokens for the user
    await storeUserTokens(session.userId, tokens, accountInfo);
    
    // Clean up the session
    pendingDeviceCodes.delete(sessionId);
    
    return {
      status: "complete",
      tokens,
      accountInfo,
    };
  } catch (error) {
    console.error("Error polling device code:", error);
    return { status: "pending" };
  }
}

/**
 * Exchange device auth code for tokens
 */
async function exchangeDeviceCodeForTokens(
  authCode: string,
  codeVerifier: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  apiKey?: string;
  expiresIn: number;
}> {
  const response = await fetch(OPENAI_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: OPENAI_OAUTH_CONFIG.deviceCallbackUri,
      client_id: OPENAI_OAUTH_CONFIG.clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token exchange failed:", response.status, error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Now do a TOKEN EXCHANGE to get an actual OpenAI API key
  // This is the critical step - the OAuth access_token doesn't have model.request scope
  // We need to exchange the id_token for an API key
  let apiKey: string | undefined;
  
  if (data.id_token) {
    try {
      apiKey = await exchangeIdTokenForApiKey(data.id_token);
      console.log("Successfully obtained API key via token exchange");
    } catch (error) {
      console.error("Failed to exchange id_token for API key:", error);
      // Continue without API key - will use access_token (may have limited scope)
    }
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    apiKey,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Exchange an id_token for an OpenAI API key using token exchange grant
 * This is how Codex gets an API key that has the model.request scope
 */
async function exchangeIdTokenForApiKey(idToken: string): Promise<string> {
  const response = await fetch(OPENAI_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      client_id: OPENAI_OAUTH_CONFIG.clientId,
      requested_token: "openai-api-key",
      subject_token: idToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("API key exchange failed:", response.status, error);
    throw new Error(`API key exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Extract account info from the id_token JWT
 */
function extractAccountInfo(idToken?: string): { email?: string; planType?: string } {
  if (!idToken) {
    return { planType: "unknown" };
  }
  
  try {
    // Decode JWT payload (middle part)
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return { planType: "unknown" };
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    
    // Extract email and plan type from the JWT claims
    const email = payload.email;
    const authClaims = payload["https://api.openai.com/auth"] || {};
    const planType = authClaims.chatgpt_plan_type || "unknown";
    
    return { email, planType };
  } catch (error) {
    console.error("Error extracting account info from id_token:", error);
    return { planType: "unknown" };
  }
}

/**
 * Cancel a pending device code session
 */
export function cancelDeviceCodeSession(sessionId: string): void {
  pendingDeviceCodes.delete(sessionId);
}

// ============================================================================
// LEGACY OAUTH FLOW - Kept for reference but not used
// ============================================================================

/**
 * Generate the OAuth authorization URL for ChatGPT login
 * @deprecated Use requestDeviceCode() instead - standard OAuth doesn't work on Vercel
 */
export function generateAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: OPENAI_OAUTH_CONFIG.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OPENAI_OAUTH_CONFIG.scopes.join(" "),
    state: state,
  });
  
  return `${OPENAI_OAUTH_CONFIG.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  tokenType: string;
}> {
  const response = await fetch(OPENAI_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OPENAI_OAUTH_CONFIG.clientId,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Refresh an expired access token using the refresh token
 * Also performs token exchange to get a new API key if id_token is returned
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  apiKey?: string;
  expiresIn: number;
}> {
  const response = await fetch(OPENAI_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: OPENAI_OAUTH_CONFIG.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  
  // If we got an id_token, exchange it for an API key
  let apiKey: string | undefined;
  if (data.id_token) {
    try {
      apiKey = await exchangeIdTokenForApiKey(data.id_token);
      console.log("Successfully refreshed API key via token exchange");
    } catch (error) {
      console.error("Failed to exchange refreshed id_token for API key:", error);
    }
  }
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    apiKey,
    expiresIn: data.expires_in,
  };
}

/**
 * Get user info from OpenAI using the access token
 */
export async function getUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
  picture?: string;
}> {
  const response = await fetch("https://api.openai.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // Try the userinfo endpoint instead
    const userInfoResponse = await fetch("https://auth.openai.com/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info");
    }
    
    return await userInfoResponse.json();
  }

  return await response.json();
}

/**
 * Store OAuth tokens for a user (encrypted)
 * 
 * IMPORTANT: We store the API key (obtained via token exchange) as the primary
 * token for making API calls. The access_token from OAuth doesn't have the
 * model.request scope needed to call chat/completions.
 */
export async function storeUserTokens(
  userId: string,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    apiKey?: string; // The actual OpenAI API key from token exchange
    expiresIn: number;
  },
  accountInfo?: {
    email?: string;
    planType?: string;
  }
) {
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  
  // Store the API key as the primary access token if available
  // This is the token that has the model.request scope
  const primaryToken = tokens.apiKey || tokens.accessToken;
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiAccessToken: encrypt(primaryToken),
      openaiRefreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      openaiIdToken: tokens.idToken ? encrypt(tokens.idToken) : null,
      openaiTokenExpiresAt: expiresAt,
      openaiAccountEmail: accountInfo?.email,
      openaiPlanType: accountInfo?.planType,
    },
  });
}

/**
 * Get a valid access token for a user (refreshes if expired)
 * 
 * NOTE: This returns the API key (obtained via token exchange), not the OAuth access_token.
 * The API key has the model.request scope needed for chat/completions.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openaiAccessToken: true,
      openaiRefreshToken: true,
      openaiIdToken: true,
      openaiTokenExpiresAt: true,
    },
  });

  if (!user?.openaiAccessToken) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = user.openaiTokenExpiresAt 
    ? new Date(user.openaiTokenExpiresAt).getTime() < Date.now() + 5 * 60 * 1000
    : true;

  if (!isExpired) {
    return decrypt(user.openaiAccessToken);
  }

  // Try to refresh if we have a refresh token
  if (user.openaiRefreshToken) {
    try {
      const refreshToken = decrypt(user.openaiRefreshToken);
      const newTokens = await refreshAccessToken(refreshToken);
      
      // Store tokens (storeUserTokens will use apiKey if available, else accessToken)
      await storeUserTokens(userId, newTokens);
      
      // Return the API key if we got one, otherwise the access token
      // The API key has the model.request scope we need
      return newTokens.apiKey || newTokens.accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Clear invalid tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          openaiAccessToken: null,
          openaiRefreshToken: null,
          openaiIdToken: null,
          openaiTokenExpiresAt: null,
        },
      });
      return null;
    }
  }

  return null;
}

/**
 * Check if a user has connected their ChatGPT account
 */
export async function isUserConnected(userId: string): Promise<{
  connected: boolean;
  email?: string;
  planType?: string;
  expiresAt?: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openaiAccessToken: true,
      openaiAccountEmail: true,
      openaiPlanType: true,
      openaiTokenExpiresAt: true,
    },
  });

  return {
    connected: !!user?.openaiAccessToken,
    email: user?.openaiAccountEmail || undefined,
    planType: user?.openaiPlanType || undefined,
    expiresAt: user?.openaiTokenExpiresAt || undefined,
  };
}

/**
 * Disconnect a user's ChatGPT account
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

/**
 * Make a chat completion request using the user's access token
 */
export async function chatCompletion(
  accessToken: string,
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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
 * Generate a CSRF state token for OAuth flow
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
