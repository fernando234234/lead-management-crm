/**
 * OpenAI Device Code Auth Route
 * 
 * Uses Device Code Flow for OAuth - compatible with Vercel deployment.
 * 
 * Flow:
 * 1. POST /api/codex/auth - Start device code flow, returns user code
 * 2. User visits verification URL and enters the code
 * 3. GET /api/codex/auth/poll?sessionId=xxx - Poll for completion
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  requestDeviceCode, 
  isUserConnected, 
  disconnectUser,
  OPENAI_OAUTH_CONFIG,
} from "@/lib/codex";

// GET: Check connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use AI Analytics
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = await isUserConnected(session.user.id);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking connection status:", error);
    return NextResponse.json(
      { error: "Failed to check connection status" },
      { status: 500 }
    );
  }
}

// POST: Start Device Code Flow
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use AI Analytics
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Request a device code from OpenAI
    const deviceCode = await requestDeviceCode(session.user.id);
    
    return NextResponse.json({
      sessionId: deviceCode.sessionId,
      userCode: deviceCode.userCode,
      verificationUrl: deviceCode.verificationUrl,
      expiresIn: deviceCode.expiresIn,
      interval: deviceCode.interval,
    });
  } catch (error) {
    console.error("Error starting device code flow:", error);
    return NextResponse.json(
      { error: "Failed to start authentication" },
      { status: 500 }
    );
  }
}

// DELETE: Disconnect ChatGPT account
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use AI Analytics
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await disconnectUser(session.user.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
