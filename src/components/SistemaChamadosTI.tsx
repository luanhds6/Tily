import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTickets } from "../hooks/useTickets";
import { Sidebar } from "./layout/Sidebar";
import { DashboardView } from "./dashboard/DashboardView";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { KnowledgeBaseView } from "./knowledge-base/KnowledgeBaseView";
import { ProfileView } from "./profile/ProfileView";
import { SettingsView } from "./settings/SettingsView";
import { Ticket, User, Mail } from "lucide-react";

export default function SistemaChamadosTI() {
  const { users, session, login, logout, getAdminUsers, isAdmin } = useAuth();
  const { tickets } = useTickets();
  const [view, setView] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Login form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const handleViewChange = (newView: string, ticketId?: string) => {
    setView(newView);
    if (ticketId) setSelectedTicketId(ticketId);
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar session={session} view={view} onViewChange={handleViewChange} onLogout={logout} />
      <main className="flex-1 lg:pt-0 pt-16">
        {view === "dashboard" && <DashboardView tickets={tickets} session={session} agents={agents} onViewChange={handleViewChange} />}
        {view === "analytics" && <AnalyticsView tickets={tickets} agents={agents} />}
        {view === "knowledge" && <KnowledgeBaseView isAdmin={isAdmin} />}
        {view === "profile" && <ProfileView session={session} tickets={tickets} />}
        {view === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
