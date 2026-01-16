import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    
    // Get first user (without password)
    const firstUser = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    return NextResponse.json({
      status: "ok",
      database: "connected",
      userCount,
      firstUser,
      env: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      status: "error",
      error: errorMessage,
      env: {
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      }
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({
        status: "error",
        step: "user_lookup",
        message: "User not found",
        emailSearched: email
      });
    }

    // Test password
    const passwordMatch = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      status: passwordMatch ? "success" : "password_mismatch",
      userFound: true,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      passwordMatch,
      passwordHashPrefix: user.password.substring(0, 20) + "..."
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      status: "error",
      error: errorMessage
    }, { status: 500 });
  }
}
