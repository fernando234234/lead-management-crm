import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    console.log("[TEST-LOGIN] Attempting login for:", email);
    
    // Exactly mirror what auth.ts does
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("[TEST-LOGIN] User not found");
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    console.log("[TEST-LOGIN] User found:", user.id);
    
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("[TEST-LOGIN] Password invalid");
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    console.log("[TEST-LOGIN] Success!");
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("[TEST-LOGIN] Error:", error);
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : "Unknown" 
    }, { status: 500 });
  }
}
