import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
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
import { Ticket, User, Mail } from "lucide-react";
import { ChatView } from "./chat/ChatView";
import { ChatFloating } from "./chat/ChatFloating";
import { useRealtimeMessages } from "../hooks/useSupabaseRealtime";
import { requestNotificationPermission, notify } from "../hooks/useNotifications";
import { InformativosView } from "./informativos/InformativosView";
import { NotificationCenterProvider, useNotificationCenter } from "@/hooks/useNotificationCenter";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import QuickLinksView from "./quick-links/QuickLinksView";

function AppWithNotifications() {
  const { users, session, login, logout, getAdminUsers, isAdmin, isMaster, createUser, updateUser, deleteUser } = useAuth();
  const { tickets, createTicket, updateTicket, addMessage, assignTicket, resolveTicket, deleteTicket } = useTickets();
  const [view, setView] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { addNotification } = useNotificationCenter();
  
  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

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

  // Login Form
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background lg:pt-0 pt-16">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg shadow-medium p-8 border border-border">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Ticket className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Sistema de Chamados TI</h2>
              <p className="text-sm text-muted-foreground mt-1">Faça login para continuar</p>
            </div>
            {err && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4 text-sm">
                {err}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); if (!login(email.trim(), password)) setErr("Credenciais inválidas"); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">Entrar</button>
              <button type="button" onClick={() => { setEmail("master@local"); setPassword("master123"); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">Demo: master@local / master123</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const agents = getAdminUsers();
  const myTickets = tickets.filter(t => t.authorId === session?.id);
  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar session={session} view={view} onViewChange={handleViewChange} onLogout={logout} />
      <main className="flex-1 lg:pt-0 pt-16 md:pr-20">
        {/* Sino de notificações global */}
        <NotificationBell />
        {view === "dashboard" && <DashboardView tickets={tickets} session={session} agents={agents} onViewChange={handleViewChange} />}
        {view === "chat" && <ChatView session={session} users={users} />}
        {view === "chamados" && (
          <TicketsPage
            session={session}
            users={users}
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onCreateTicket={handleNewTicket}
          />
        )}
        {view === "informativos" && <InformativosView session={session} />}
        {view === "links" && <QuickLinksView session={session} />}
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
          />
        )}
        {view === "new" && <NewTicketForm onSubmit={handleNewTicket} onCancel={() => setView("chamados")} />}
        {view === "users" && session && isMaster && (
          <UsersManagementView
            users={users}
            currentUser={users.find(u => u.id === session.id)!}
            onCreateUser={handleCreateUser}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
          />
        )}
        {view === "analytics" && <AnalyticsView tickets={tickets} agents={agents} />}
        {view === "knowledge" && <KnowledgeBaseView isAdmin={isAdmin} />}
        {view === "profile" && <ProfileView session={session} tickets={tickets} />}
        {view === "settings" && (
          isAdmin ? (
            <AdminSettingsPage
              session={session}
              users={users}
              tickets={tickets}
              onCreateUser={handleCreateUser}
              onUpdateUser={updateUser}
              onDeleteUser={deleteUser}
            />
          ) : (
            <SettingsView />
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
