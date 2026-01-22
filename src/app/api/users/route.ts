import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';

// GET all users (Admin only)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { assignedLeads: true }
        }
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST create new user (Admin only - creates Commercial/Marketing accounts)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate username from name (lowercase + dot)
    const username = body.username || `${body.name.toLowerCase().split(' ')[0]}.`;
    
    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Username già in uso' }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await hash(body.password, 12);
    
    // Commercial users must change password on first login
    const mustChangePassword = body.role === 'COMMERCIAL';
    
    const user = await prisma.user.create({
      data: {
        username,
        email: body.email || null,
        name: body.name,
        password: hashedPassword,
        role: body.role, // COMMERCIAL or MARKETING
        mustChangePassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
