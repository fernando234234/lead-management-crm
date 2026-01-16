"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  Trash2,
  Mail,
  UserPlus,
  TrendingUp,
  Megaphone,
  Clock,
  AlertCircle,
  Filter,
  BellOff,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { it } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

const notificationIcons: Record<string, React.ReactNode> = {
  LEAD_ASSIGNED: <UserPlus className="w-5 h-5 text-blue-500" />,
  LEAD_STATUS_CHANGED: <TrendingUp className="w-5 h-5 text-green-500" />,
  LEAD_ENROLLED: <Check className="w-5 h-5 text-emerald-500" />,
  CAMPAIGN_CREATED: <Megaphone className="w-5 h-5 text-purple-500" />,
  REMINDER: <Clock className="w-5 h-5 text-orange-500" />,
  SYSTEM: <AlertCircle className="w-5 h-5 text-gray-500" />,
};

type FilterType = "all" | "unread" | "read";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (filter === "unread") {
        params.set("unreadOnly", "true");
      }

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data: NotificationsResponse = await res.json();
        let filteredNotifications = data.notifications;
        
        // Filtra localmente per "lette"
        if (filter === "read") {
          filteredNotifications = data.notifications.filter((n) => n.read);
        }

        setNotifications(filteredNotifications);
        setTotalPages(data.pagination.pages);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle notifiche:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PUT",
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Errore nel segnare la notifica come letta:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Errore nell'eliminazione della notifica:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Errore nel segnare tutte le notifiche come lette:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: it,
      });
    } catch {
      return "";
    }
  };

  const getDateGroup = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) return "Oggi";
    if (isYesterday(date)) return "Ieri";
    if (isThisWeek(date)) return "Questa settimana";
    return "Precedenti";
  };

  const groupedNotifications = notifications.reduce((acc, notification) => {
    const group = getDateGroup(notification.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(notification);
    return acc;
  }, {} as Record<string, Notification[]>);

  const groupOrder = ["Oggi", "Ieri", "Questa settimana", "Precedenti"];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} notific${unreadCount === 1 ? "a" : "he"} non lett${unreadCount === 1 ? "a" : "e"}`
              : "Nessuna notifica non letta"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Check className="w-4 h-4" />
            Segna tutto come letto
          </button>
        )}
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-2">
          {[
            { key: "all", label: "Tutte" },
            { key: "unread", label: "Non lette" },
            { key: "read", label: "Lette" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key as FilterType);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista notifiche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p>Caricamento...</p>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nessuna notifica"
            description={
              filter === "unread"
                ? "Non hai notifiche non lette."
                : filter === "read"
                ? "Non hai notifiche lette."
                : "Le tue notifiche appariranno qui quando riceverai aggiornamenti."
            }
            accentColor="admin"
          />
        ) : (
          <>
            {groupOrder.map((group) => {
              const groupNotifications = groupedNotifications[group];
              if (!groupNotifications || groupNotifications.length === 0)
                return null;

              return (
                <div key={group}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600">
                      {group}
                    </h3>
                  </div>
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 px-4 py-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                        !notification.read
                          ? "bg-blue-50 hover:bg-blue-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {notificationIcons[notification.type] || (
                          <Bell className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-medium ${
                              !notification.read
                                ? "text-gray-900"
                                : "text-gray-600"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </button>

                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Segna come letta"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Precedente
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Pagina {page} di {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Successiva
          </button>
        </div>
      )}
    </div>
  );
}
