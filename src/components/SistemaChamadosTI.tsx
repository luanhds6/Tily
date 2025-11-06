import React, { useEffect, useState } from "react";
import { useAuth, Session as LegacySession } from "../hooks/useAuth";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { Sidebar } from "./layout/Sidebar";
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
  // Supabase auth (fonte de verdade para sessão)
  const { user, profile, loading, isAdmin, isMaster, signOut } = useSupabaseAuth();

  // Hooks locais existentes (usuários, tickets, etc.)
  const { users, getAdminUsers, createUser, updateUser, deleteUser } = useAuth();
  const { tickets, createTicket, updateTicket, addMessage, assignTicket, resolveTicket, deleteTicket, markTicketOpenedByAuthor, markTicketReplyReadByAuthor } = useTickets();
  const [view, setView] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { addNotification } = useNotificationCenter();
  
  // Converte sessão Supabase para sessão legada esperada pelos componentes
  const session: LegacySession | null = user
    ? {
        id: user.id,
        name: profile?.full_name ?? user.email ?? "Usuário",
        email: user.email ?? "",
        role: profile?.is_master ? "master" : profile?.role === "admin" ? "admin" : "user",
      }
    : null;

  const access = useAccessControl(session);

  // Usa a role efetiva vinda do access control para refletir corretamente na UI
  const displaySession: LegacySession | null = session
    ? {
        ...session,
        role:
          access?.perms?.role === "master"
            ? "master"
            : access?.perms?.role === "admin"
            ? "admin"
            : session.role,
      }
    : null;

  const handleViewChange = (newView: string, ticketId?: string) => {
    setView(newView);
    if (ticketId) setSelectedTicketId(ticketId);
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setView("detail");
  };

  const handleNewTicket = (data: any) => {
    if (!session) return;
    createTicket(session.id, session.name, data);
    setView("chamados");
  };

  // Solicita permissão de notificação quando o usuário está logado
  useEffect(() => {
    if (session) {
      requestNotificationPermission();
    }
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
        {view === "dashboard" && access.perms.permissions["dashboard"] && (
          <DashboardView tickets={tickets} session={session} agents={agents} onViewChange={handleViewChange} />
        )}
        {view === "chat" && access.perms.permissions["chat"] && <ChatView session={session} users={users} />}
        {view === "chamados" && access.perms.permissions["tickets"] && (
          <TicketsPage
            session={session}
            users={users}
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onCreateTicket={handleNewTicket}
          />
        )}
        {view === "informativos" && access.perms.permissions["informativos"] && <InformativosView session={session} />}
        {view === "links" && access.perms.permissions["quick_links"] && <QuickLinksView session={session} />}
        {view === "detail" && selectedTicket && session && (
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
        )}
        {view === "new" && <NewTicketForm onSubmit={handleNewTicket} onCancel={() => setView("chamados")} />}
        {view === "users" && session && isMaster && (
          <ProfilesManagementView />
        )}
        {view === "analytics" && access.perms.permissions["analytics"] && <AnalyticsView tickets={tickets} agents={agents} />}
        {view === "knowledge" && access.perms.permissions["knowledge"] && <KnowledgeBaseView isAdmin={isAdmin} />}
        {view === "profile" && access.perms.permissions["profile"] && <ProfileView session={displaySession!} tickets={tickets} />}
        {view === "settings" && (
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
        )}
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
