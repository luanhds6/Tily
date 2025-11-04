import { useState, useEffect } from "react";

const LS_TICKETS = "sc_tickets_v2";

export interface Message {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  attachments: any[];
  createdAt: string;
}

export interface Ticket {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  category: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  status: "Aberto" | "Em Progresso" | "Aguardando" | "Resolvido" | "Fechado";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  assignedToName?: string;
  tags: string[];
  sla: number; // hours
  messages: Message[];
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadJSON(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>(() => loadJSON(LS_TICKETS, []));

  useEffect(() => {
    saveJSON(LS_TICKETS, tickets);
  }, [tickets]);

  const createTicket = (userId: string, userName: string, data: Partial<Ticket>) => {
    const slaMap: Record<string, number> = {
      "Urgente": 4,
      "Alta": 8,
      "Média": 24,
      "Baixa": 48,
    };

    const ticket: Ticket = {
      id: uid("t"),
      authorId: userId,
      authorName: userName,
      title: data.title || "",
      description: data.description || "",
      category: data.category || "Geral",
      priority: data.priority || "Média",
      status: "Aberto",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: data.tags || [],
      sla: slaMap[data.priority || "Média"],
      messages: [
        {
          id: uid("m"),
          authorId: userId,
          authorName: userName,
          text: data.description || "",
          attachments: data.messages?.[0]?.attachments || [],
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setTickets((prev) => [ticket, ...prev]);
    return ticket;
  };

  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      )
    );
  };

  const addMessage = (ticketId: string, userId: string, userName: string, text: string, attachments: any[] = []) => {
    const message: Message = {
      id: uid("m"),
      authorId: userId,
      authorName: userName,
      text,
      attachments,
      createdAt: new Date().toISOString(),
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, messages: [...t.messages, message], updatedAt: new Date().toISOString() }
          : t
      )
    );
  };

  const assignTicket = (ticketId: string, agentId: string, agentName: string) => {
    updateTicket(ticketId, {
      assignedTo: agentId,
      assignedToName: agentName,
      status: "Em Progresso",
    });
  };

  const resolveTicket = (ticketId: string) => {
    updateTicket(ticketId, {
      status: "Resolvido",
      resolvedAt: new Date().toISOString(),
    });
  };

  const deleteTicket = (ticketId: string) => {
    if (confirm("Tem certeza que deseja excluir este chamado?")) {
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    }
  };

  return {
    tickets,
    createTicket,
    updateTicket,
    addMessage,
    assignTicket,
    resolveTicket,
    deleteTicket,
  };
}
