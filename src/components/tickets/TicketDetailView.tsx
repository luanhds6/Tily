import React, { useState } from "react";
import { Ticket, Message } from "@/hooks/useTickets";
import { Session, User } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Paperclip, Clock, User as UserIcon, Calendar, Tag, CheckCircle, Wrench } from "lucide-react";

interface TicketDetailViewProps {
  ticket: Ticket;
  session: Session;
  users: User[];
  agents: Array<{ id: string; name: string }>;
  onBack: () => void;
  onAddMessage: (ticketId: string, userId: string, userName: string, text: string, attachments: any[]) => void;
  onUpdateStatus: (ticketId: string, updates: Partial<Ticket>) => void;
  onAssignTicket: (ticketId: string, agentId: string, agentName: string) => void;
  onDeleteTicket: (ticketId: string) => void;
}

export function TicketDetailView({
  ticket,
  session,
  users,
  agents,
  onBack,
  onAddMessage,
  onUpdateStatus,
  onAssignTicket,
  onDeleteTicket,
}: TicketDetailViewProps) {
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);

  const isAdmin = session.role === "admin" || session.role === "master";
  const canEdit = isAdmin || session.id === ticket.authorId;
  const isOwner = session.id === ticket.authorId;
  const isResolved = ticket.status === "Resolvido";
  const wasResolved = !!ticket.resolvedAt; // uma vez resolvido, não pode mais excluir
  const canDelete = !wasResolved && (isAdmin || isOwner);
  const canReopen = isResolved && (isAdmin || isOwner);
  const author = users.find((u) => u.id === ticket.authorId);

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

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && attachments.length === 0) return;

    onAddMessage(ticket.id, session.id, session.name, replyText, attachments);
    // Se um agente/admin respondeu ao ticket de um usuário, muda status para "Aguardando"
    if (isAdmin && session.id !== ticket.authorId) {
      onUpdateStatus(ticket.id, { status: "Aguardando" });
    }
    setReplyText("");
    setAttachments([]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newAttachments = await Promise.all(filePromises);
    setAttachments([...attachments, ...newAttachments]);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSLAStatus = () => {
    const now = new Date();
    const created = new Date(ticket.createdAt);
    const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    const slaRemaining = ticket.sla - hoursElapsed;

    if (slaRemaining < 0) return { text: "SLA expirado", color: "text-destructive" };
    if (slaRemaining < 2) return { text: `${Math.round(slaRemaining)}h restante`, color: "text-orange-500" };
    return { text: `${Math.round(slaRemaining)}h restante`, color: "text-muted-foreground" };
  };

  const slaStatus = getSLAStatus();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Ticket Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-2">{ticket.title}</h1>
              <p className="text-sm text-muted-foreground">#{ticket.id}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
              <Badge variant="outline" className={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  {author?.avatar ? (
                    <AvatarImage src={author.avatar} alt={ticket.authorName} />
                  ) : (
                    <AvatarFallback>{(ticket.authorName || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Autor</p>
                  <p className="font-medium">{ticket.authorName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className={`h-4 w-4 ${slaStatus.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">SLA</p>
                <p className={`font-medium ${slaStatus.color}`}>{slaStatus.text}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="font-medium">{ticket.category}</p>
              </div>
            </div>
          </div>

          {/* Ações de usuário/admin: Excluir e Reabrir */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            {canReopen && (
              <Button
                type="button"
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => onUpdateStatus(ticket.id, { status: "Aberto" })}
              >
                Reabrir chamado
              </Button>
            )}
            {canDelete && (
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDeleteTicket(ticket.id)}
              >
                Excluir chamado
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <label className="text-sm font-medium mb-2 block">Ações rápidas</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => {
                      onUpdateStatus(ticket.id, { status: "Resolvido", resolvedAt: new Date().toISOString() });
                      onBack();
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como resolvido
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => onUpdateStatus(ticket.id, { status: "Em Progresso" })}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Ir para atendimento
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Atribuir para</label>
                <Select
                  value={ticket.assignedTo || "unassigned"}
                  onValueChange={(value) => {
                    if (value === "unassigned") {
                      onUpdateStatus(ticket.id, { assignedTo: undefined, assignedToName: undefined });
                    } else {
                      const agent = agents.find((a) => a.id === value);
                      if (agent) onAssignTicket(ticket.id, agent.id, agent.name);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Messages */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Histórico de Mensagens</h2>
        {ticket.messages.map((message, index) => (
          <Card key={message.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(message.authorName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{message.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Mensagem inicial
                    </Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {message.attachments.map((att: any, i: number) => (
                      <div key={i} className="border border-border rounded p-2 text-xs">
                        {att.type?.startsWith("image/") ? (
                          <img src={att.dataUrl} alt={att.name} className="max-w-xs rounded" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            {att.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reply Form */}
      {canEdit && (
        <Card className="p-4">
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Adicionar resposta</label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[120px]"
              />
            </div>
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachments.map((att, i) => (
                  <div key={i} className="relative border border-border rounded p-2">
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                    <p className="text-xs">{att.name}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anexar arquivos
                  </label>
                </Button>
              </div>
              <Button type="submit" disabled={!replyText.trim() && attachments.length === 0}>
                <Send className="h-4 w-4 mr-2" />
                Enviar resposta
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
