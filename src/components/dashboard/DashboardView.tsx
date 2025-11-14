import React from "react";
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Users as UsersIcon } from "lucide-react";
import { Ticket as TicketType } from "../../hooks/useTickets";
import { Session } from "../../hooks/useAuth";
import { AgentRanking } from "./AgentRanking";
import { User } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";

interface DashboardViewProps {
  tickets: TicketType[];
  session: Session;
  agents: User[];
  onViewChange: (view: string, ticketId?: string) => void;
}

function StatCard({ icon: Icon, label, value, variant = "default", onClick }: any) {
  const variants: Record<string, string> = {
    default: "bg-card border-border hover:border-primary/30",
    primary: "bg-primary/5 border-primary/20 hover:border-primary/40",
    success: "bg-success/5 border-success/20 hover:border-success/40",
    warning: "bg-warning/5 border-warning/20 hover:border-warning/40",
    danger: "bg-destructive/5 border-destructive/20 hover:border-destructive/40",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-6 shadow-soft transition-all cursor-pointer ${variants[variant]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
        </div>
        <div className="w-12 h-12 bg-background/50 rounded-lg flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary" />
        </div>
      </div>
    </div>
  );
}

export function DashboardView({ tickets, session, agents, onViewChange }: DashboardViewProps) {
const isAdmin = session.role === "master";

  // Calculate stats
  const myTickets = tickets.filter((t) => t.authorId === session.id);
  const openTickets = tickets.filter((t) => t.status === "Aberto");
  const inProgressTickets = tickets.filter((t) => t.status === "Em Progresso");
  const resolvedTickets = tickets.filter((t) => t.status === "Resolvido");
  const urgentTickets = tickets.filter((t) => t.priority === "Urgente" && (t.status === "Aberto" || t.status === "Em Progresso"));

  // SLA warnings
  const slaWarnings = tickets.filter((t) => {
    if (t.status === "Resolvido" || t.status === "Fechado") return false;
    const hours = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    return hours > t.sla * 0.8; // 80% of SLA
  });

  // My assigned tickets (for admins)
  const myAssignedTickets = isAdmin ? tickets.filter((t) => t.assignedTo === session.id) : [];

  // Recent tickets
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      "Urgente": "bg-destructive/10 text-destructive",
      "Alta": "bg-warning/10 text-warning",
      "Média": "bg-primary/10 text-primary",
      "Baixa": "bg-muted text-muted-foreground",
    };
    return colors[priority] || colors["Média"];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Aberto": "bg-primary/10 text-primary",
      "Em Progresso": "bg-warning/10 text-warning",
      "Aguardando": "bg-orange-500/10 text-orange-600",
      "Resolvido": "bg-success/10 text-success",
      "Fechado": "bg-muted text-muted-foreground",
    };
    return colors[status] || colors["Aberto"];
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Bem-vindo(a) de volta, {session.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAdmin ? (
          <>
            <StatCard
              icon={Ticket}
              label="Total de Chamados"
              value={tickets.length}
              variant="primary"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={Clock}
              label="Abertos"
              value={openTickets.length}
              variant="warning"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={CheckCircle}
              label="Resolvidos"
              value={resolvedTickets.length}
              variant="success"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={AlertTriangle}
              label="SLA em Risco"
              value={slaWarnings.length}
              variant="danger"
              onClick={() => onViewChange("chamados")}
            />
          </>
        ) : (
          <>
            <StatCard
              icon={Ticket}
              label="Meus Chamados"
              value={myTickets.length}
              variant="primary"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={Clock}
              label="Em Aberto"
              value={myTickets.filter((t) => t.status === "Aberto" || t.status === "Em Progresso").length}
              variant="warning"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={CheckCircle}
              label="Resolvidos"
              value={myTickets.filter((t) => t.status === "Resolvido").length}
              variant="success"
              onClick={() => onViewChange("chamados")}
            />
            <StatCard
              icon={TrendingUp}
              label="Este Mês"
              value={myTickets.filter((t) => {
                const diff = Date.now() - new Date(t.createdAt).getTime();
                return diff < 30 * 24 * 60 * 60 * 1000;
              }).length}
              variant="default"
              onClick={() => onViewChange("chamados")}
            />
          </>
        )}
      </div>

      {/* Admin Section - Agent Ranking */}
      {isAdmin && (
        <AgentRanking tickets={tickets} agents={agents} />
      )}

      {/* My Assigned Tickets (Admin) */}
      {isAdmin && myAssignedTickets.length > 0 && (
        <div className="bg-card border border-border rounded-lg shadow-soft">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              Chamados Atribuídos a Mim ({myAssignedTickets.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {myAssignedTickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onViewChange("detail", ticket.id)}
                className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">Por {ticket.authorName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Chamados Recentes
          </h3>
        </div>
        <div className="divide-y divide-border">
          {recentTickets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum chamado encontrado</p>
              <Button
                variant="link"
                onClick={() => onViewChange("chamados")}
                className="mt-3 text-sm"
              >
                Criar primeiro chamado
              </Button>
            </div>
          ) : (
            recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onViewChange("detail", ticket.id)}
                className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.authorName} • {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
