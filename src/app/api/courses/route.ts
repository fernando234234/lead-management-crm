import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all courses
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true, campaigns: true }
        }
      }
    });
    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST create new course (Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const course = await prisma.course.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        active: body.active ?? true,
      },
    });
    
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
