import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/tasks - Fetch all tasks for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // all, overdue, today, completed
    const leadId = searchParams.get("leadId");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (leadId) {
      where.leadId = leadId;
    }

    if (filter === "overdue") {
      where.dueDate = { lt: todayStart };
      where.completed = false;
    } else if (filter === "today") {
      where.dueDate = { gte: todayStart, lte: todayEnd };
      where.completed = false;
    } else if (filter === "completed") {
      where.completed = true;
    } else if (filter !== "all") {
      // Default: show incomplete tasks
      where.completed = false;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { completed: "asc" },
        { dueDate: "asc" },
        { priority: "asc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Errore nel caricamento dei task" }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.title || !body.dueDate) {
      return NextResponse.json(
        { error: "Titolo e data di scadenza sono obbligatori" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        leadId: body.leadId || null,
        title: body.title,
        description: body.description || null,
        dueDate: new Date(body.dueDate),
        priority: body.priority || "MEDIUM",
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Errore nella creazione del task" }, { status: 500 });
  }
}
