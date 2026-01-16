"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Check,
  Mail,
  UserPlus,
  TrendingUp,
  Megaphone,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  unreadCount: number;
}

const notificationIcons: Record<string, React.ReactNode> = {
  LEAD_ASSIGNED: <UserPlus className="w-4 h-4 text-blue-500" />,
  LEAD_STATUS_CHANGED: <TrendingUp className="w-4 h-4 text-green-500" />,
  LEAD_ENROLLED: <Check className="w-4 h-4 text-emerald-500" />,
  CAMPAIGN_CREATED: <Megaphone className="w-4 h-4 text-purple-500" />,
  REMINDER: <Clock className="w-4 h-4 text-orange-500" />,
  SYSTEM: <AlertCircle className="w-4 h-4 text-gray-500" />,
};

interface NotificationBellProps {
  role: "admin" | "commercial" | "marketing";
}

export function NotificationBell({ role }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data: NotificationsResponse = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle notifiche:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll ogni 30 secondi
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Errore nel segnare tutte le notifiche come lette:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsOpen(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label={unreadCount > 0 ? `Notifiche, ${unreadCount} non lette` : "Notifiche"}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5" aria-hidden="true" />
        ) : (
          <Bell className="w-5 h-5" aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          role="menu"
          aria-label="Menu notifiche"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900" id="notifications-title">Notifiche</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 focus:outline-none focus:underline"
              >
                Segna tutto come letto
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto" role="group" aria-labelledby="notifications-title">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>Nessuna notifica</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                  role="menuitem"
                  aria-label={`${notification.title}${!notification.read ? ' (non letta)' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
                      {notificationIcons[notification.type] || (
                        <Bell className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            !notification.read
                              ? "text-gray-900"
                              : "text-gray-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                router.push(`/${role}/notifications`);
                setIsOpen(false);
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline"
              role="menuitem"
            >
              Vedi tutte le notifiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
