import { useEffect, useRef, useState } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: Array<{ name: string; type: string; dataUrl: string; size?: number }>
}

const LS_CHAT = "sc_chat_v1";

function loadJSON(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function uid(prefix = "c") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useChat(initialRoomId: string) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const channelRef = useRef<any>(null);

  // Load messages for current room
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!roomId) {
        setMessages([]);
        return;
      }
      if (isSupabaseEnabled && supabase) {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });
        if (!mounted) return;
        if (error) console.error("Erro ao carregar chat:", error);
        setMessages(
          (data || []).map((r: any) => ({
            id: r.id,
            roomId: r.room_id,
            senderId: r.sender_id,
            senderName: r.sender_name,
            text: r.text || "",
            createdAt: r.created_at,
            attachments: r.attachments || [],
          }))
        );
      } else {
        const store = loadJSON(LS_CHAT, {} as Record<string, ChatMessage[]>);
        setMessages((store[roomId] || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  // Subscribe realtime for current room
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    if (!roomId) return;
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              id: r.id,
              roomId: r.room_id,
              senderId: r.sender_id,
              senderName: r.sender_name,
              text: r.text || "",
              createdAt: r.created_at,
              attachments: r.attachments || [],
            },
          ]);
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [roomId]);

  const sendMessage = async (
    senderId: string,
    senderName: string,
    text: string,
    attachments: Array<{ name: string; type: string; dataUrl: string; size?: number }> = []
  ) => {
    const msg: ChatMessage = {
      id: uid("cm"),
      roomId,
      senderId,
      senderName,
      text,
      createdAt: new Date().toISOString(),
      attachments,
    };
    setMessages((prev) => [...prev, msg]);
    if (isSupabaseEnabled && supabase) {
      const { error } = await supabase.from("chat_messages").insert({
        id: msg.id,
        room_id: msg.roomId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        text: msg.text,
        created_at: msg.createdAt,
        attachments: msg.attachments || [],
      });
      if (error) console.error("Erro ao enviar mensagem de chat:", error);
    } else {
      const store = loadJSON(LS_CHAT, {} as Record<string, ChatMessage[]>);
      const roomMsgs = store[roomId] || [];
      store[roomId] = [...roomMsgs, msg];
      saveJSON(LS_CHAT, store);
    }
  };

  return { roomId, setRoomId, messages, sendMessage };
}