import React, { createContext, useContext, useMemo, useState } from "react";

export type NotificationCategory = "chat" | "ticket" | "informativo";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
};

type Ctx = {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (n: Omit<NotificationItem, "id" | "createdAt" | "read"> & { id?: string }) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
};

// Persistência local removida: notificações são efêmeras em memória

function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const NotificationCenterContext = createContext<Ctx | null>(null);

export function NotificationCenterProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const addNotification: Ctx["addNotification"] = (n) => {
    const item: NotificationItem = {
      id: n.id || uid(),
      title: n.title,
      body: n.body,
      category: n.category,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 200));
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const clear = () => setNotifications([]);

  const value: Ctx = { notifications, unreadCount, addNotification, markAllRead, markRead, clear };
  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationCenterContext);
  if (!ctx) throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  return ctx;
}