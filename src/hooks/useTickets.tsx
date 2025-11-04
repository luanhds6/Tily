import { useState, useEffect } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

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
  const [loadedFromSupabase, setLoadedFromSupabase] = useState(false);

  // Carrega tickets do Supabase (se configurado)
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!isSupabaseEnabled || !supabase) return;
      const { data: ticketRows, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (tErr) {
        console.error("Erro ao carregar tickets do Supabase:", tErr);
        return;
      }

      const { data: messageRows, error: mErr } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (mErr) {
        console.error("Erro ao carregar mensagens do Supabase:", mErr);
        return;
      }

      const messagesByTicket = new Map<string, Message[]>();
      (messageRows || []).forEach((row: any) => {
        const msg: Message = {
          id: row.id,
          authorId: row.author_id,
          authorName: row.author_name,
          text: row.text || "",
          attachments: row.attachments || [],
          createdAt: row.created_at,
        };
        const list = messagesByTicket.get(row.ticket_id) || [];
        list.push(msg);
        messagesByTicket.set(row.ticket_id, list);
      });

      const mapped: Ticket[] = (ticketRows || []).map((row: any) => ({
        id: row.id,
        authorId: row.author_id,
        authorName: row.author_name,
        title: row.title,
        description: row.description || "",
        category: row.category || "Geral",
        priority: row.priority || "Média",
        status: row.status || "Aberto",
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        resolvedAt: row.resolved_at || undefined,
        assignedTo: row.assigned_to || undefined,
        assignedToName: row.assigned_to_name || undefined,
        tags: row.tags || [],
        sla: row.sla || 24,
        messages: messagesByTicket.get(row.id) || [],
      }));

      setTickets(mapped);
      setLoadedFromSupabase(true);
      // Cache local para carregamentos rápidos
      saveJSON(LS_TICKETS, mapped);
    };

    loadFromSupabase();
  }, []);

  // Assina inserções de mensagens no Supabase para manter estado sincronizado
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const channel = supabase
      .channel("messages_sync_state")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as any;
          const newMsg: Message = {
            id: row.id,
            authorId: row.author_id,
            authorName: row.author_name,
            text: row.text || "",
            attachments: row.attachments || [],
            createdAt: row.created_at,
          };
          setTickets((prev) =>
            prev.map((t) =>
              t.id === row.ticket_id
                ? {
                    ...t,
                    messages: t.messages.some((m) => m.id === newMsg.id)
                      ? t.messages
                      : [...t.messages, newMsg],
                    updatedAt: new Date().toISOString(),
                  }
                : t
            )
          );
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, []);

  // Mantém cache local quando não estiver usando Supabase
  useEffect(() => {
    if (!isSupabaseEnabled) {
      saveJSON(LS_TICKETS, tickets);
    }
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
          // Usa anexos enviados pelo formulário de novo chamado
          // (data.attachments) como anexos da mensagem inicial
          attachments: (data as any)?.attachments || data.messages?.[0]?.attachments || [],
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Otimista: atualiza estado local
    setTickets((prev) => [ticket, ...prev]);

    // Persiste no Supabase em background
    if (isSupabaseEnabled && supabase) {
      const persist = async () => {
        const { error: tError } = await supabase.from("tickets").insert({
          id: ticket.id,
          author_id: ticket.authorId,
          author_name: ticket.authorName,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
          resolved_at: ticket.resolvedAt || null,
          assigned_to: ticket.assignedTo || null,
          assigned_to_name: ticket.assignedToName || null,
          tags: ticket.tags,
          sla: ticket.sla,
        });
        if (tError) console.error("Erro ao inserir ticket:", tError);

        const initialMsg = ticket.messages[0];
        const { error: mError } = await supabase.from("messages").insert({
          id: initialMsg.id,
          ticket_id: ticket.id,
          author_id: initialMsg.authorId,
          author_name: initialMsg.authorName,
          text: initialMsg.text,
          attachments: initialMsg.attachments,
          created_at: initialMsg.createdAt,
        });
        if (mError) console.error("Erro ao inserir mensagem inicial:", mError);
      };
      persist();
    }

    return ticket;
  };

  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    const updatedAt = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, ...updates, updatedAt } : t
      )
    );

    if (isSupabaseEnabled && supabase) {
      const persist = async () => {
        const { error } = await supabase
          .from("tickets")
          .update({
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.priority !== undefined && { priority: updates.priority }),
            ...(updates.status !== undefined && { status: updates.status }),
            ...(updates.resolvedAt !== undefined && { resolved_at: updates.resolvedAt }),
            ...(updates.assignedTo !== undefined && { assigned_to: updates.assignedTo }),
            ...(updates.assignedToName !== undefined && { assigned_to_name: updates.assignedToName }),
            updated_at: updatedAt,
          })
          .eq("id", ticketId);
        if (error) console.error("Erro ao atualizar ticket:", error);
      };
      persist();
    }
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

    if (isSupabaseEnabled && supabase) {
      const persist = async () => {
        const { error } = await supabase.from("messages").insert({
          id: message.id,
          ticket_id: ticketId,
          author_id: userId,
          author_name: userName,
          text,
          attachments,
          created_at: message.createdAt,
        });
        if (error) console.error("Erro ao adicionar mensagem:", error);
      };
      persist();
    }
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
      if (isSupabaseEnabled && supabase) {
        const persist = async () => {
          const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
          if (error) console.error("Erro ao excluir ticket:", error);
        };
        persist();
      }
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
