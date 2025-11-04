import React, { useEffect, useMemo, useRef, useState } from "react";
import { Session } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { requestNotificationPermission, notify } from "@/hooks/useNotifications";

interface ChatViewProps {
  session: Session;
  users: Array<{ id: string; name: string; role: string }>;
}

export function ChatView({ session, users }: ChatViewProps) {
  const isAdmin = session.role === "admin" || session.role === "master";
  const [selectedUserId, setSelectedUserId] = useState<string>(users.find(u => u.role === "user")?.id || "");
  const roomId = isAdmin ? selectedUserId || session.id : session.id;
  const { messages, sendMessage, setRoomId } = useChat(roomId);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    setRoomId(roomId);
  }, [roomId, setRoomId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  // Notifica quando chega mensagem de outra pessoa
  const lastMsg = useMemo(() => messages[messages.length - 1], [messages]);
  useEffect(() => {
    if (lastMsg && lastMsg.senderId !== session.id) {
      notify("Nova mensagem no chat de suporte", { body: `${lastMsg.senderName}: ${lastMsg.text.slice(0, 120)}` });
    }
  }, [lastMsg, session.id]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId) return;
    sendMessage(session.id, session.name, text.trim());
    setText("");
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Chat com Suporte</h1>
        </div>
        {isAdmin && (
          <div className="w-64">
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.role === "user").map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card className="p-0 h-[60vh] flex flex-col">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => {
            const mine = m.senderId === session.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg p-3 text-sm shadow-soft border 
                  ${mine ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-foreground border-border"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {!mine && (
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>{getInitials(m.senderName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="font-medium">{mine ? "Você" : m.senderName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
          />
          <Button type="submit" disabled={!text.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </form>
      </Card>
    </div>
  );
}