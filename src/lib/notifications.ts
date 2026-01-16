import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

/**
 * Crea una nuova notifica per un utente
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });
    return notification;
  } catch (error) {
    console.error("Errore nella creazione della notifica:", error);
    return null;
  }
}

/**
 * Crea notifiche per tutti gli utenti con un determinato ruolo
 */
export async function createNotificationForRole(
  role: "ADMIN" | "COMMERCIAL" | "MARKETING",
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((user) =>
        createNotification(user.id, type, title, message, link)
      )
    );

    return notifications.filter(Boolean);
  } catch (error) {
    console.error("Errore nella creazione delle notifiche per ruolo:", error);
    return [];
  }
}

/**
 * Segna una notifica come letta
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  } catch (error) {
    console.error("Errore nel segnare la notifica come letta:", error);
    return null;
  }
}

/**
 * Segna tutte le notifiche di un utente come lette
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    return await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } catch (error) {
    console.error("Errore nel segnare tutte le notifiche come lette:", error);
    return null;
  }
}

/**
 * Ottieni il conteggio delle notifiche non lette
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    return await prisma.notification.count({
      where: { userId, read: false },
    });
  } catch (error) {
    console.error("Errore nel conteggio delle notifiche:", error);
    return 0;
  }
}
