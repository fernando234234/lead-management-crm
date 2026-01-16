import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/notifications/[id] - Segna come letta
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notifica non trovata" },
        { status: 404 }
      );
    }

    // Verifica che la notifica appartenga all'utente corrente
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { read: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Errore nell'aggiornamento della notifica:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento della notifica" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Elimina notifica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notifica non trovata" },
        { status: 404 }
      );
    }

    // Verifica che la notifica appartenga all'utente corrente
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore nell'eliminazione della notifica:", error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione della notifica" },
      { status: 500 }
    );
  }
}
