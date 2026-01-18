import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/goals - Get goals for current user or all users (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const userId = searchParams.get('userId');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Non-admin users can only see their own goals
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (month) where.month = month;
    if (year) where.year = year;

    const goals = await prisma.goal.findMany({
      where,
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
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    // For each goal, calculate current progress
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const startOfMonth = new Date(goal.year, goal.month - 1, 1);
        const endOfMonth = new Date(goal.year, goal.month, 0, 23, 59, 59);

        // Get leads assigned to this user in this month
        const leadsData = await prisma.lead.aggregate({
          where: {
            assignedToId: goal.userId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _count: true,
        });

        // Get contacted leads
        const contactedData = await prisma.lead.count({
          where: {
            contactedById: goal.userId,
            contactedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });

        // Get enrolled leads
        const enrolledData = await prisma.lead.count({
          where: {
            assignedToId: goal.userId,
            enrolled: true,
            enrolledAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });

        // Get revenue from enrolled leads
        const revenueData = await prisma.lead.aggregate({
          where: {
            assignedToId: goal.userId,
            enrolled: true,
            enrolledAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            revenue: { not: null },
          },
          _sum: {
            revenue: true,
          },
        });

        return {
          ...goal,
          progress: {
            leads: leadsData._count,
            contacted: contactedData,
            enrolled: enrolledData,
            revenue: revenueData._sum.revenue || 0,
          },
        };
      })
    );

    return NextResponse.json(goalsWithProgress);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero degli obiettivi' },
      { status: 500 }
    );
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await request.json();
    const { month, year, targetLeads, targetEnrolled, targetCalls, targetRevenue, notes, userId } = body;

    // Validate required fields
    if (!month || !year) {
      return NextResponse.json(
        { error: 'Mese e anno sono obbligatori' },
        { status: 400 }
      );
    }

    // Determine target user
    let targetUserId = session.user.id;
    
    // Only admins can create goals for other users
    if (userId && session.user.role === 'ADMIN') {
      targetUserId = userId;
    } else if (userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato a creare obiettivi per altri utenti' },
        { status: 403 }
      );
    }

    // Check if goal already exists for this user/month/year
    const existingGoal = await prisma.goal.findUnique({
      where: {
        userId_month_year: {
          userId: targetUserId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });

    if (existingGoal) {
      return NextResponse.json(
        { error: 'Un obiettivo per questo mese esiste già' },
        { status: 409 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        userId: targetUserId,
        month: parseInt(month),
        year: parseInt(year),
        targetLeads: targetLeads ? parseInt(targetLeads) : 0,
        targetEnrolled: targetEnrolled ? parseInt(targetEnrolled) : 0,
        targetCalls: targetCalls ? parseInt(targetCalls) : 0,
        targetRevenue: targetRevenue ? parseFloat(targetRevenue) : 0,
        notes: notes || null,
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

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Errore nella creazione dell\'obiettivo' },
      { status: 500 }
    );
  }
}
