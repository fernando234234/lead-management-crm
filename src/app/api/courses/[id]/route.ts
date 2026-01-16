import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { leads: true, campaigns: true }
        }
      }
    });
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

// PUT update course (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        price: body.price,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        active: body.active,
      },
    });
    
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE course (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if course has leads
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: { _count: { select: { leads: true } } }
    });
    
    if (course && course._count.leads > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with existing leads' },
        { status: 400 }
      );
    }
    
    await prisma.course.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
