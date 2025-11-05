import React, { useMemo, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationCenter();
  const [open, setOpen] = useState(false);

  const recent = useMemo(() => notifications.slice(0, 15), [notifications]);

  return (
    <div className="fixed z-50 sm:top-4 sm:right-4 bottom-4 right-4">
      <button
        className="relative rounded-full p-2 bg-background border border-border shadow-soft hover:bg-muted"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <Card className="mt-2 w-[86vw] sm:w-[340px] border border-border shadow-large bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-semibold">Notificações</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => markAllRead()} title="Marcar todas como lidas">
                <CheckCircle2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          </div>
          <div className="max-h-[50vh] sm:max-h-[360px] overflow-y-auto p-2 space-y-2">
            {recent.length === 0 && (
              <div className="text-sm text-muted-foreground px-2 py-4">Sem notificações</div>
            )}
            {recent.map((n) => (
              <div
                key={n.id}
                className={`p-2 rounded-md border ${n.read ? "bg-background border-border" : "bg-primary/5 border-primary/20"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </div>
                  {!n.read && (
                    <button className="text-xs text-primary" onClick={() => markRead(n.id)}>Marcar lida</button>
                  )}
                </div>
                <div className="text-sm font-medium mt-1">{n.title}</div>
                {n.body && <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</div>}
                <div className="text-[11px] mt-1 text-muted-foreground">{n.category === "chat" ? "Chat" : n.category === "ticket" ? "Chamado" : "Informativo"}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}