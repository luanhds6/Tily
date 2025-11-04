import React from "react";
import { Trophy, TrendingUp, Clock, CheckCircle2, Star } from "lucide-react";
import { Ticket } from "../../hooks/useTickets";
import { User } from "../../hooks/useAuth";

interface AgentRankingProps {
  tickets: Ticket[];
  agents: User[];
}

interface AgentStats {
  id: string;
  name: string;
  department?: string;
  resolved: number;
  inProgress: number;
  avgResolutionTime: number;
  satisfaction: number;
  totalHandled: number;
}

export function AgentRanking({ tickets, agents }: AgentRankingProps) {
  const calculateAgentStats = (): AgentStats[] => {
    return agents.map((agent) => {
      const agentTickets = tickets.filter((t) => t.assignedTo === agent.id);
      const resolved = agentTickets.filter((t) => t.status === "Resolvido" || t.status === "Fechado");
      const inProgress = agentTickets.filter((t) => t.status === "Em Progresso");

      const avgResolutionTime = resolved.length > 0
        ? resolved.reduce((acc, t) => {
            if (t.resolvedAt) {
              const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
              return acc + diff / (1000 * 60 * 60); // hours
            }
            return acc;
          }, 0) / resolved.length
        : 0;

      // Satisfaction score baseado em tempo de resolução vs SLA
      const satisfaction = resolved.length > 0
        ? resolved.reduce((acc, t) => {
            if (t.resolvedAt) {
              const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
              const hours = diff / (1000 * 60 * 60);
              const score = hours < t.sla ? 100 : Math.max(0, 100 - ((hours - t.sla) / t.sla) * 50);
              return acc + score;
            }
            return acc;
          }, 0) / resolved.length
        : 0;

      return {
        id: agent.id,
        name: agent.name,
        department: agent.department,
        resolved: resolved.length,
        inProgress: inProgress.length,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        satisfaction: Math.round(satisfaction),
        totalHandled: agentTickets.length,
      };
    }).sort((a, b) => b.resolved - a.resolved);
  };

  const stats = calculateAgentStats();
  const topAgent = stats[0];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-warning" />;
    if (index === 1) return <Star className="w-5 h-5 text-muted-foreground" />;
    if (index === 2) return <Star className="w-5 h-5 text-orange-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getPerformanceBadge = (satisfaction: number) => {
    if (satisfaction >= 90) return { label: "Excelente", className: "bg-success/10 text-success" };
    if (satisfaction >= 75) return { label: "Bom", className: "bg-primary/10 text-primary" };
    if (satisfaction >= 60) return { label: "Regular", className: "bg-warning/10 text-warning" };
    return { label: "Baixo", className: "bg-destructive/10 text-destructive" };
  };

  return (
    <div className="space-y-4">
      {/* Top Performer Highlight */}
      {topAgent && topAgent.resolved > 0 && (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground">{topAgent.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPerformanceBadge(topAgent.satisfaction).className}`}>
                  {getPerformanceBadge(topAgent.satisfaction).label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">🏆 Melhor Atendente do Período</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Resolvidos</div>
                  <div className="text-xl font-bold text-success">{topAgent.resolved}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Em Andamento</div>
                  <div className="text-xl font-bold text-primary">{topAgent.inProgress}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tempo Médio</div>
                  <div className="text-xl font-bold text-foreground">{topAgent.avgResolutionTime}h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Satisfação</div>
                  <div className="text-xl font-bold text-warning">{topAgent.satisfaction}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Ranking de Atendentes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Atendente</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Depto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolvidos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Progresso</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tempo Médio</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Satisfação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((agent, index) => {
                const badge = getPerformanceBadge(agent.satisfaction);
                return (
                  <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center">{getRankIcon(index)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{agent.name}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {agent.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="font-semibold text-foreground">{agent.resolved}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className="text-primary font-medium">{agent.inProgress}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{agent.avgResolutionTime}h</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {agent.satisfaction}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum dado de atendimento disponível
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
