import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/leads/[id]/activities
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Impossibile recuperare le attività" },
      { status: 500 }
    );
  }
}

// POST /api/leads/[id]/activities
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { type, description, metadata } = body;

    if (!type || !description) {
      return NextResponse.json(
        { error: "Tipo e descrizione sono obbligatori" },
        { status: 400 }
      );
    }

    // Validate activity type
    const validTypes = [
      "NOTE",
      "CALL",
      "EMAIL",
      "STATUS_CHANGE",
      "ASSIGNMENT",
      "ENROLLMENT",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Tipo di attività non valido" },
        { status: 400 }
      );
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead non trovato" },
        { status: 404 }
      );
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: params.id,
        userId: session.user.id,
        type,
        description,
        metadata: metadata || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Impossibile creare l'attività" },
      { status: 500 }
    );
  }
}
