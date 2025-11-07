import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, Session as LegacySession } from "../hooks/useAuth";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { Sidebar } from "./layout/Sidebar";
import PageTransition from "./layout/PageTransition";
import { DashboardView } from "./dashboard/DashboardView";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { KnowledgeBaseView } from "./knowledge-base/KnowledgeBaseView";
import { ProfileView } from "./profile/ProfileView";
import { SettingsView } from "./settings/SettingsView";
import AdminSettingsPage from "./settings/AdminSettingsPage";
import { TicketListView } from "./tickets/TicketListView";
import { TicketDetailView } from "./tickets/TicketDetailView";
import { NewTicketForm } from "./tickets/NewTicketForm";
import { TicketsPage } from "./tickets/TicketsPage";
import { UsersManagementView } from "./users/UsersManagementView";
import ProfilesManagementView from "./users/ProfilesManagementView";
import { Ticket, User, Mail } from "lucide-react";
import { ChatView } from "./chat/ChatView";
import { ChatFloating } from "./chat/ChatFloating";
import { useRealtimeMessages } from "../hooks/useSupabaseRealtime";
import { requestNotificationPermission, notify } from "../hooks/useNotifications";
import { InformativosView } from "./informativos/InformativosView";
import { NotificationCenterProvider, useNotificationCenter } from "@/hooks/useNotificationCenter";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import QuickLinksView from "./quick-links/QuickLinksView";
import { useAccessControl } from "@/hooks/useAccessControl";

function AppWithNotifications() {
  const navigate = useNavigate();
  const location = useLocation();
  // Supabase auth (fonte de verdade para sessão)
  const { user, profile, loading, isAdmin, isMaster, signOut } = useSupabaseAuth();

  // Hooks locais existentes (usuários, tickets, etc.)
  const { users, getAdminUsers, createUser, updateUser, deleteUser } = useAuth();
  const { tickets, createTicket, updateTicket, addMessage, assignTicket, resolveTicket, deleteTicket, markTicketOpenedByAuthor, markTicketReplyReadByAuthor } = useTickets();
  const [view, setView] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view") || "dashboard";
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("ticket") || null;
  });
  const { addNotification } = useNotificationCenter();
  
  // Converte sessão Supabase para sessão legada esperada pelos componentes
  const session: LegacySession | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: profile?.full_name ?? user.fullName ?? user.email ?? "Usuário",
      email: user.email ?? "",
      role: user.role,
    };
  }, [user, profile?.full_name]);

  const access = useAccessControl(session);

  // Usa a role efetiva vinda do access control para refletir corretamente na UI
  const displaySession: LegacySession | null = useMemo(() => {
    if (!session) return null;
    const effectiveRole = access?.perms?.role;
    if (effectiveRole === "master" || effectiveRole === "admin") {
      return { ...session, role: effectiveRole };
    }
    return session;
  }, [session, access?.perms?.role]);

  const updateUrlState = useCallback((nextView: string, options?: { ticketId?: string | null }) => {
    const params = new URLSearchParams(location.search);
    params.set("view", nextView);
    if (options?.ticketId) {
      params.set("ticket", options.ticketId);
    } else {
      params.delete("ticket");
    }
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const handleViewChange = useCallback((newView: string, ticketId?: string) => {
    setView(newView);
    if (ticketId) {
      setSelectedTicketId(ticketId);
      updateUrlState(newView, { ticketId });
    } else {
      setSelectedTicketId(null);
      updateUrlState(newView);
    }
  }, [updateUrlState]);

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setView("detail");
    updateUrlState("detail", { ticketId });
  };

  const handleNewTicket = (data: any) => {
    if (!session) return;
    createTicket(session.id, session.name, data);
    setView("chamados");
    setSelectedTicketId(null);
    updateUrlState("chamados");
  };

  // Solicita permissão de notificação quando o usuário está logado
  const hasRequestedNotifications = useRef(false);

  useEffect(() => {
    if (!session) {
      hasRequestedNotifications.current = false;
      return;
    }

    if (hasRequestedNotifications.current) return;
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Ainda dispara fora de um gesto do usuário, mas apenas uma vez por sessão para evitar loop de warnings.
        requestNotificationPermission();
      }
    }
    hasRequestedNotifications.current = true;
  }, [session]);

  // Assina novas mensagens e envia notificação se for resposta ao usuário
  useRealtimeMessages((row) => {
    if (!session) return;
    const ticket = tickets.find((t) => t.id === row.ticket_id);
    if (!ticket) return;
    const isForCurrentUser = ticket.authorId === session.id;
    const isFromOther = row.author_id !== session.id;
    if (isForCurrentUser && isFromOther) {
      const title = `Resposta no chamado: ${ticket.title}`;
      const body = `${row.author_name} respondeu: ${(row.text || "").slice(0, 120)}`;
      notify(title, { body });
      addNotification({ title, body, category: "ticket" });
    }
  });

  const handleCreateUser = (data: { name: string; email: string; password: string; role: "user" | "admin" }) => {
    createUser({ ...data, active: true });
  };

  // Sincroniza alterações no URL (ex: recarregar, edição manual)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlView = params.get("view") || "dashboard";
    const urlTicket = params.get("ticket");

    if (urlView !== view) {
      setView(urlView);
    }

    if (urlTicket || selectedTicketId) {
      if ((urlTicket ?? null) !== (selectedTicketId ?? null)) {
        setSelectedTicketId(urlTicket ?? null);
      }
    }
  }, [location.search]);

  // Proteção de rota: redireciona para /login quando não autenticado (Supabase)
  if (!loading && !session) {
    return <Navigate to="/login" replace />;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Enquanto carrega permissões, manter indicador
  if (access.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Validando permissões...</div>
      </div>
    );
  }

  const agents = getAdminUsers();
  const myTickets = tickets.filter(t => t.authorId === session?.id);
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        session={displaySession!}
        view={view}
        onViewChange={handleViewChange}
        onLogout={async () => {
          const { error } = await signOut();
          if (error) {
            console.error("Erro ao sair:", error.message);
          }
          // Navega via SPA para maior confiabilidade
          navigate("/login", { replace: true });
        }}
      />
      <main className="flex-1 lg:pt-0 pt-16 md:pr-20">
        {/* Sino de notificações global */}
        <NotificationBell />

        {(() => {
          const pageKey = selectedTicketId ? `${view}:${selectedTicketId}` : view;
          let content: React.ReactNode = null;

          if (view === "dashboard" && access.perms.permissions["dashboard"]) {
            content = (
              <DashboardView tickets={tickets} session={session} agents={agents} onViewChange={handleViewChange} />
            );
          } else if (view === "chat" && access.perms.permissions["chat"]) {
            content = <ChatView session={session} users={users} />;
          } else if (view === "chamados" && access.perms.permissions["tickets"]) {
            content = (
              <TicketsPage
                session={session}
                users={users}
                tickets={tickets}
                onTicketClick={handleTicketClick}
                onCreateTicket={handleNewTicket}
              />
            );
          } else if (view === "informativos" && access.perms.permissions["informativos"]) {
            content = <InformativosView session={session} />;
          } else if (view === "links" && access.perms.permissions["quick_links"]) {
            content = <QuickLinksView session={session} />;
          } else if (view === "detail" && selectedTicket && session) {
            content = (
              <TicketDetailView
                ticket={selectedTicket}
                session={session}
                users={users}
                agents={agents}
                onBack={() => setView("chamados")}
                onAddMessage={addMessage}
                onUpdateStatus={updateTicket}
                onAssignTicket={assignTicket}
                onDeleteTicket={deleteTicket}
                onMarkOpenedByAuthor={markTicketOpenedByAuthor}
                onMarkReplyReadByAuthor={markTicketReplyReadByAuthor}
              />
            );
          } else if (view === "new") {
            content = <NewTicketForm onSubmit={handleNewTicket} onCancel={() => setView("chamados")} />;
          } else if (view === "users" && session && isMaster) {
            content = <ProfilesManagementView />;
          } else if (view === "analytics" && access.perms.permissions["analytics"]) {
            content = <AnalyticsView tickets={tickets} agents={agents} />;
          } else if (view === "knowledge" && access.perms.permissions["knowledge"]) {
            content = <KnowledgeBaseView isAdmin={isAdmin} />;
          } else if (view === "profile" && access.perms.permissions["profile"]) {
            content = <ProfileView session={displaySession!} tickets={tickets} />;
          } else if (view === "settings") {
            content = (
              (access.perms.role === "master" || access.perms.role === "admin") ? (
                <AdminSettingsPage
                  session={displaySession!}
                  users={users}
                  tickets={tickets}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={updateUser}
                  onDeleteUser={deleteUser}
                />
              ) : (
                access.perms.permissions["settings"] ? <SettingsView /> : (
                  <div className="p-6">
                    <div className="text-sm text-muted-foreground">Sem acesso às configurações.</div>
                  </div>
                )
              )
            );
          }

          return (
            <PageTransition viewKey={pageKey}>
              {content}
            </PageTransition>
          );
        })()}
      </main>
      {/* Chat flutuante disponível globalmente */}
      <ChatFloating session={session} users={users} />
    </div>
  );
}

export default function SistemaChamadosTI() {
  return (
    <NotificationCenterProvider>
      <AppWithNotifications />
    </NotificationCenterProvider>
  );
}
