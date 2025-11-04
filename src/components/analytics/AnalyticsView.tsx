import React, { useState } from "react";
import { BarChart3, TrendingUp, Clock, Users, Download, Calendar } from "lucide-react";
import { Ticket } from "../../hooks/useTickets";
import { User } from "../../hooks/useAuth";

interface AnalyticsViewProps {
  tickets: Ticket[];
  agents: User[];
}

export function AnalyticsView({ tickets, agents }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const filterByPeriod = (tickets: Ticket[]) => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return tickets.filter((t) => new Date(t.createdAt).getTime() > cutoff);
  };

  const filteredTickets = filterByPeriod(tickets);

  // Stats
  const totalTickets = filteredTickets.length;
  const resolvedTickets = filteredTickets.filter((t) => t.status === "Resolvido" || t.status === "Fechado");
  const avgResolutionTime = resolvedTickets.length > 0
    ? resolvedTickets.reduce((acc, t) => {
        if (t.resolvedAt) {
          const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
          return acc + diff / (1000 * 60 * 60);
        }
        return acc;
      }, 0) / resolvedTickets.length
    : 0;

  const resolutionRate = totalTickets > 0 ? (resolvedTickets.length / totalTickets) * 100 : 0;

  // By Category
  const byCategory = filteredTickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // By Priority
  const byPriority = filteredTickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // By Status
  const byStatus = filteredTickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Timeline data (last 7 days)
  const timelineData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayTickets = filteredTickets.filter((t) => {
      const created = new Date(t.createdAt);
      return created >= date && created < nextDate;
    });

    return {
      date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      created: dayTickets.length,
      resolved: dayTickets.filter((t) => t.status === "Resolvido" || t.status === "Fechado").length,
    };
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Relatórios e Análises
          </h1>
          <p className="text-muted-foreground mt-1">Métricas e estatísticas do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total de Chamados</p>
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{totalTickets}</p>
          <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Taxa de Resolução</p>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold text-success">{Math.round(resolutionRate)}%</p>
          <p className="text-xs text-muted-foreground mt-1">{resolvedTickets.length} de {totalTickets}</p>
        </div>

        <div className="bg-warning/5 border border-warning/20 rounded-lg p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <p className="text-3xl font-bold text-warning">{Math.round(avgResolutionTime * 10) / 10}h</p>
          <p className="text-xs text-muted-foreground mt-1">De resolução</p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Atendentes</p>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{agents.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Ativos no sistema</p>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
        <h3 className="font-semibold text-foreground mb-4">Tendência dos Últimos 7 Dias</h3>
        <div className="space-y-3">
          {timelineData.map((day, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-16 text-sm text-muted-foreground">{day.date}</div>
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Criados</span>
                    <span className="text-xs font-bold text-primary">{day.created}</span>
                  </div>
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((day.created / Math.max(...timelineData.map((d) => d.created))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">Resolvidos</span>
                    <span className="text-xs font-bold text-success">{day.resolved}</span>
                  </div>
                  <div className="h-2 bg-success/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${Math.min((day.resolved / Math.max(...timelineData.map((d) => d.resolved))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By Category */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4">Por Categoria</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{cat}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(count / totalTickets) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4">Por Prioridade</h3>
          <div className="space-y-3">
            {Object.entries(byPriority).map(([priority, count]) => {
              const colors: Record<string, string> = {
                "Urgente": "bg-destructive",
                "Alta": "bg-warning",
                "Média": "bg-primary",
                "Baixa": "bg-muted-foreground",
              };
              return (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{priority}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[priority]} rounded-full`}
                        style={{ width: `${(count / totalTickets) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h3 className="font-semibold text-foreground mb-4">Por Status</h3>
          <div className="space-y-3">
            {Object.entries(byStatus).map(([status, count]) => {
              const colors: Record<string, string> = {
                "Aberto": "bg-primary",
                "Em Progresso": "bg-warning",
                "Aguardando": "bg-orange-500",
                "Resolvido": "bg-success",
                "Fechado": "bg-muted-foreground",
              };
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[status]} rounded-full`}
                        style={{ width: `${(count / totalTickets) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
