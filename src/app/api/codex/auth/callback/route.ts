/**
 * Device Code Polling Route
 * 
 * Polls for device code authentication completion.
 * The frontend calls this periodically to check if the user has completed auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  pollDeviceCode,
  getDeviceCodeSession,
  cancelDeviceCodeSession,
} from "@/lib/codex";

// GET: Poll for device code completion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can use AI Analytics
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const deviceSession = getDeviceCodeSession(sessionId);
    if (!deviceSession) {
      return NextResponse.json({
        status: "expired",
        error: "Session expired or not found",
      });
    }

    if (deviceSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Poll for completion
    const result = await pollDeviceCode(sessionId);

    if (!result) {
      return NextResponse.json({ status: "pending" });
    }

    if (result.status === "complete") {
      return NextResponse.json({
        status: "complete",
        email: result.accountInfo?.email,
        planType: result.accountInfo?.planType,
      });
    }

    if (result.status === "expired") {
      return NextResponse.json({
        status: "expired",
        error: "Authentication session expired",
      });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    console.error("Error polling device code:", error);
    return NextResponse.json(
      { error: "Failed to check authentication status" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a pending device code session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId parameter" },
        { status: 400 }
      );
    }

    // Verify the session belongs to this user
    const deviceSession = getDeviceCodeSession(sessionId);
    if (deviceSession && deviceSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    cancelDeviceCodeSession(sessionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling device code session:", error);
    return NextResponse.json(
      { error: "Failed to cancel session" },
      { status: 500 }
    );
  }
}
