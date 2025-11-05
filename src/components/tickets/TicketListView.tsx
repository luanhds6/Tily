import React, { useState } from "react";
import { Ticket } from "@/hooks/useTickets";
import { User as UserType } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, AlertCircle, User as UserIcon, Calendar, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TicketListViewProps {
  tickets: Ticket[];
  users: UserType[];
  onTicketClick: (ticketId: string) => void;
  title: string;
}

export function TicketListView({ tickets, users, onTicketClick, title }: TicketListViewProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgente": return "bg-destructive text-destructive-foreground";
      case "Alta": return "bg-orange-500 text-white";
      case "Média": return "bg-yellow-500 text-white";
      case "Baixa": return "bg-blue-500 text-white";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aberto": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "Em Progresso": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "Aguardando": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "Resolvido": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "Fechado": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCardHighlight = (status: string) => {
    switch (status) {
      case "Aguardando":
        return "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20";
      case "Resolvido":
        return "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20";
      default:
        return "";
    }
  };

  const getSLAStatus = (ticket: Ticket) => {
    const now = new Date();
    const created = new Date(ticket.createdAt);
    const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const slaRemaining = ticket.sla - hoursElapsed;

    if (slaRemaining < 0) return { text: "SLA expirado", color: "text-destructive" };
    if (slaRemaining < 2) return { text: `${Math.round(slaRemaining)}h restante`, color: "text-orange-500" };
    return { text: `${Math.round(slaRemaining)}h restante`, color: "text-muted-foreground" };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <div className="text-sm text-muted-foreground">
          {filteredTickets.length} {filteredTickets.length === 1 ? "chamado" : "chamados"}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, descrição ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Em Progresso">Em Progresso</SelectItem>
              <SelectItem value="Aguardando">Aguardando</SelectItem>
              <SelectItem value="Resolvido">Resolvido</SelectItem>
              <SelectItem value="Fechado">Fechado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as prioridades</SelectItem>
              <SelectItem value="Urgente">Urgente</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum chamado encontrado</p>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const sla = getSLAStatus(ticket);
            return (
              <Card
                key={ticket.id}
                className={`p-4 cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 ${getCardHighlight(ticket.status)}`}
                onClick={() => onTicketClick(ticket.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{ticket.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {ticket.description}
                        </p>
                      </div>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        <Avatar className="w-5 h-5">
                          {users.find((u) => u.id === ticket.authorId)?.avatar ? (
                            <AvatarImage src={users.find((u) => u.id === ticket.authorId)!.avatar!} alt={ticket.authorName} />
                          ) : (
                            <AvatarFallback>{(ticket.authorName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                          )}
                        </Avatar>
                        <span>{ticket.authorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className={`h-3 w-3 ${sla.color}`} />
                        <span className={sla.color}>{sla.text}</span>
                      </div>
                      {ticket.assignedToName && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Atribuído:</span> {ticket.assignedToName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(ticket.status)}>
                      {ticket.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {ticket.category}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
