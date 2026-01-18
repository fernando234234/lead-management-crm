import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/goals/[id] - Get a specific goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Obiettivo non trovato' },
        { status: 404 }
      );
    }

    // Non-admin users can only see their own goals
    if (session.user.role !== 'ADMIN' && goal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    // Calculate progress
    const startOfMonth = new Date(goal.year, goal.month - 1, 1);
    const endOfMonth = new Date(goal.year, goal.month, 0, 23, 59, 59);

    const [leadsData, contactedData, enrolledData, revenueData] = await Promise.all([
      prisma.lead.aggregate({
        where: {
          assignedToId: goal.userId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _count: true,
      }),
      prisma.lead.count({
        where: {
          contactedById: goal.userId,
          contactedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.lead.count({
        where: {
          assignedToId: goal.userId,
          enrolled: true,
          enrolledAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.lead.aggregate({
        where: {
          assignedToId: goal.userId,
          enrolled: true,
          enrolledAt: { gte: startOfMonth, lte: endOfMonth },
          revenue: { not: null },
        },
        _sum: { revenue: true },
      }),
    ]);

    return NextResponse.json({
      ...goal,
      progress: {
        leads: leadsData._count,
        contacted: contactedData,
        enrolled: enrolledData,
        revenue: revenueData._sum.revenue || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dell\'obiettivo' },
      { status: 500 }
    );
  }
}

// PUT /api/goals/[id] - Update a goal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingGoal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Obiettivo non trovato' },
        { status: 404 }
      );
    }

    // Non-admin users can only update their own goals
    if (session.user.role !== 'ADMIN' && existingGoal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const { targetLeads, targetEnrolled, targetCalls, targetRevenue, notes } = body;

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...(targetLeads !== undefined && { targetLeads: parseInt(targetLeads) }),
        ...(targetEnrolled !== undefined && { targetEnrolled: parseInt(targetEnrolled) }),
        ...(targetCalls !== undefined && { targetCalls: parseInt(targetCalls) }),
        ...(targetRevenue !== undefined && { targetRevenue: parseFloat(targetRevenue) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dell\'obiettivo' },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/[id] - Delete a goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;

    const existingGoal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Obiettivo non trovato' },
        { status: 404 }
      );
    }

    // Non-admin users can only delete their own goals
    if (session.user.role !== 'ADMIN' && existingGoal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    await prisma.goal.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Obiettivo eliminato con successo' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione dell\'obiettivo' },
      { status: 500 }
    );
  }
}
