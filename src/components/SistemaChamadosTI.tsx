import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Session as LegacySession } from "../hooks/useAuth";
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
import QuickTicketFloating from "./tickets/QuickTicketFloating";
import { UsersManagementView } from "./users/UsersManagementView";
import ProfilesManagementView from "./users/ProfilesManagementView";
import { Ticket, User, Mail } from "lucide-react";
import { ChatView } from "./chat/ChatView";
import { ChatFloating } from "./chat/ChatFloating";
import { useRealtimeMessages } from "../hooks/useSupabaseRealtime";
import { isSupabaseEnabled, supabase } from "@/lib/supabase";
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
  const { user, profile, loading, isAdmin, isMaster, signOut, listProfilesByCompany, listAllUsers } = useSupabaseAuth();

  // Removido: hooks locais antigos (useAuth) não são mais usados para dados
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
      name: profile?.full_name ?? user.fullName ?? (user.email ?? "Usuário"),
      email: user.email ?? "",
      role: user.role,
    };
  }, [user, profile?.full_name]);

  const access = useAccessControl(session);

  // Admins via Supabase (sincroniza ranking com administradores cadastrados)
  const [supabaseAgents, setSupabaseAgents] = useState<User[] | null>(null);
  useEffect(() => {
    let active = true;
    async function loadAdmins() {
      // Usa Supabase apenas quando habilitado
      if (!isSupabaseEnabled) {
        setSupabaseAgents(null);
        return;
      }
      try {
        const { data, error } = await listProfilesByCompany();
        if (error) {
          console.warn("Falha ao listar perfis do Supabase:", error.message);
          if (active) setSupabaseAgents(null);
          return;
        }
        const admins = (data ?? []).filter((row: any) => (row.is_master === true) && row.is_active !== false);
        const mapped: User[] = admins.map((row: any) => ({
          id: row.user_id,
          name: (row.full_name as string | null) ?? (row.email as string | null) ?? row.user_id,
          email: (row.email as string | null) ?? "",
          password: "",
          role: row.is_master ? "master" : "user",
          active: row.is_active ?? true,
          avatar: (row.avatar_url as string | null) ?? undefined,
          department: undefined,
        }));
        if (active) setSupabaseAgents(mapped);
      } catch (e) {
        console.error("Erro inesperado ao carregar admins do Supabase:", e);
        if (active) setSupabaseAgents(null);
      }
    }
    loadAdmins();
    return () => {
      active = false;
    };
    // Recarrega quando usuário ou empresa do perfil mudar
  }, [user?.id, profile?.company_id, isSupabaseEnabled]);

  // Usuários para o Chat via Supabase (todos os cadastrados)
  const [chatUsers, setChatUsers] = useState<Array<{ id: string; name: string; role: string; avatar?: string }>>([]);
  useEffect(() => {
    let active = true;
    async function loadChatUsers() {
      // Supabase obrigatório: sem fallback local
      try {
        const { data, error } = await listAllUsers();
        if (error) {
          console.warn("Falha ao listar todos usuários do Supabase:", error.message);
          if (active) setChatUsers([]);
          return;
        }
        const mapped = (data ?? []).map((row: any) => ({
          id: row.user_id,
          name: (row.full_name as string | null) ?? (row.email as string | null) ?? row.user_id,
          role: row.is_master ? "master" : row.role ?? "user",
          avatar: (row.avatar_url as string | null) ?? undefined,
        }));
        if (active) setChatUsers(mapped);
      } catch (e) {
        console.error("Erro inesperado ao carregar usuários do chat:", e);
        if (active) setChatUsers([]);
      }
    }
    loadChatUsers();
    // Assina mudanças em perfis para manter nomes e papéis atualizados em tempo real
    let sub: any = null;
    if (isSupabaseEnabled && supabase) {
      try {
        // Atualiza lista de chat users sempre que perfil for inserido/atualizado/deletado
        sub = supabase
          .channel("profiles_live")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => loadChatUsers())
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => loadChatUsers())
          .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles" }, () => loadChatUsers())
          .subscribe();
      } catch {}
    }
    return () => {
      active = false;
      try {
        if (sub && supabase) {
          const state = (sub as any)?.state;
          if (state === "joined" || state === "joining" || state === "leaving") {
            Promise.resolve(sub.unsubscribe?.()).catch(() => {});
          }
        }
      } catch {}
    };
  }, [isSupabaseEnabled, user?.id]);

  // Lista de usuários utilizada pela UI (Tickets, ChatFloating) deve ser memoizada
  const usersForUI = useMemo(() => (
    chatUsers.map(u => ({ id: u.id, name: u.name, email: "", password: "", role: u.role, active: true, avatar: u.avatar, department: undefined }))
  ), [chatUsers]);

  // Usa a role efetiva vinda do access control para refletir corretamente na UI
  const displaySession: LegacySession | null = useMemo(() => {
    if (!session) return null;
    const effectiveRole = access?.perms?.role;
    if (effectiveRole === "master") {
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

  const handleQuickCreate = useCallback(
    async (payload: { title: string; description?: string; priority?: string; attachments?: any[] }) => {
      if (!session) return;
      try {
        await createTicket(session.id, session.name, {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          // Armazena anexos como parte da mensagem inicial
          attachments: payload.attachments || [],
        });
        addNotification({
          title: "Ticket criado",
          body: "Seu Ticket Rápido foi criado com sucesso.",
          category: "ticket",
        });
      } catch (e: any) {
        addNotification({
          title: "Falha ao criar ticket",
          body: e?.message || "Não foi possível criar o Ticket Rápido.",
          category: "ticket",
        });
      }
    },
    [session, createTicket]
  );

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

  // Removido: criação de usuários via hooks locais. Gestão de perfis agora é via Supabase.

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
  // Se a view atual não é permitida, redireciona para uma view segura
  useEffect(() => {
    const perms = access.perms.permissions;
    const isPrivileged = access.perms.role === "master";
    const canView = (id: string) => {
      if (id === "settings") return isPrivileged || !!perms["settings"];
      if (id === "dashboard") return isPrivileged || !!perms["dashboard"];
      // Mapear view "chamados" para a permissão correta "tickets"
      if (id === "chamados") return isPrivileged || !!perms["tickets"];
      // Mapear view "links" para a permissão correta "quick_links"
      if (id === "links") return isPrivileged || !!perms["quick_links"];
      return !!perms[id as keyof typeof perms];
    };

    const preferredOrder = ["dashboard", "chamados", "informativos", "chat", "links", "profile", "settings"];
    const pickFirstAllowed = (): string => {
      for (const v of preferredOrder) {
        if (canView(v)) return v;
      }
      return "chamados";
    };

    if (!access.loading && !canView(view)) {
      const safe = pickFirstAllowed();
      if (view !== safe) {
        handleViewChange(safe);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.loading, access.perms.permissions, access.perms.role, view]);

  // Proteção de rota: redireciona para /login quando não autenticado (Supabase)
  if (isSupabaseEnabled && !loading && !session) {
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

  // Usa admins do Supabase quando disponíveis; sem fallback local
  const agents = supabaseAgents ?? [];
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
              <DashboardView tickets={tickets} session={displaySession!} agents={agents} onViewChange={handleViewChange} />
            );
          } else if (view === "chat" && access.perms.permissions["chat"]) {
            content = <ChatView session={session} users={chatUsers} />;
          } else if (view === "chamados" && access.perms.permissions["tickets"]) {
            content = (
              <TicketsPage
                session={displaySession!}
                users={usersForUI}
                tickets={tickets}
                onTicketClick={handleTicketClick}
                onCreateTicket={handleNewTicket}
              />
            );
          } else if (view === "informativos" && access.perms.permissions["informativos"]) {
            content = <InformativosView session={displaySession!} />;
          } else if (view === "links" && access.perms.permissions["quick_links"]) {
            content = <QuickLinksView session={displaySession!} />;
          } else if (view === "detail" && selectedTicket && session) {
            content = (
              <TicketDetailView
                ticket={selectedTicket}
                session={displaySession!}
                users={usersForUI}
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
              (access.perms.role === "master") ? (
                <AdminSettingsPage
                  session={displaySession!}
                  tickets={tickets}
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
              {content ?? (
                <div className="p-6">
                  <div className="text-sm text-muted-foreground">Sem conteúdo disponível para esta visão.</div>
                </div>
              )}
            </PageTransition>
          );
        })()}
      </main>
      {/* Chat flutuante disponível globalmente */}
      <QuickTicketFloating
        visible={!!session && !!access.perms.permissions["tickets"]}
        onCreate={handleQuickCreate}
      />
      <ChatFloating session={session} users={usersForUI.map(u => ({ id: u.id, name: u.name, role: u.role, avatar: u.avatar }))} />
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
