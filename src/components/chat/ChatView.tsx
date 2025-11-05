import React, { useEffect, useMemo, useRef, useState } from "react";
import { Session } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Paperclip, Search } from "lucide-react";
import { requestNotificationPermission, notify } from "@/hooks/useNotifications";

interface ChatViewProps {
  session: Session;
  users: Array<{ id: string; name: string; role: string }>;
}

export function ChatView({ session, users }: ChatViewProps) {
  const isAdmin = session.role === "admin" || session.role === "master";
  const [selectedUserId, setSelectedUserId] = useState<string>(users.find((u) => u.role === "user")?.id || "");
  const roomId = isAdmin ? selectedUserId || session.id : session.id;
  const { messages, sendMessage, setRoomId } = useChat(roomId);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

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

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const contacts = users.filter((u) => u.role === "user");
  const filteredContacts = useMemo(
    () => contacts.filter((u) => (u.name || "").toLowerCase().includes(search.trim().toLowerCase())),
    [contacts, search],
  );

  const activeContact = isAdmin ? users.find((u) => u.id === selectedUserId) : null;

  return (
    <div className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-4rem)] p-2 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full">
        {/* Sidebar de contatos (admin) */}
        {isAdmin && (
          <Card className="flex flex-col h-full">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar contatos"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredContacts.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full text-left px-3 py-2 rounded-md border hover:bg-muted/50 transition-colors ${
                    selectedUserId === u.id ? "bg-primary/10 border-primary/20" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : <AvatarFallback>{getInitials(u.name)}</AvatarFallback>}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground">Conversa com suporte</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredContacts.length === 0 && (
                <div className="text-xs text-muted-foreground px-3">Nenhum contato encontrado</div>
              )}
            </div>
          </Card>
        )}

        {/* Conversa */}
        <Card className="flex flex-col h-full">
          {/* Cabeçalho da conversa */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-3">
            <Avatar className="w-8 h-8">
              {isAdmin && activeContact?.avatar ? (
                <AvatarImage src={activeContact.avatar} alt={activeContact.name} />
              ) : (
                <AvatarFallback>
                  {isAdmin ? getInitials(activeContact?.name || "?") : getInitials("Suporte TI")}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {isAdmin ? activeContact?.name || "Selecione um contato" : "Suporte TI"}
              </span>
              <span className="text-xs text-muted-foreground">online</span>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
            {messages.map((m) => {
              const mine = m.senderId === session.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft border leading-relaxed ${
                      mine
                        ? "bg-primary/10 text-foreground border-primary/20 rounded-br-sm"
                        : "bg-background text-foreground border-border rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {!mine && (
                        <Avatar className="w-6 h-6">
                          {users.find((u) => u.id === m.senderId)?.avatar ? (
                            <AvatarImage src={users.find((u) => u.id === m.senderId)!.avatar!} alt={m.senderName} />
                          ) : (
                            <AvatarFallback>{getInitials(m.senderName)}</AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Entrada de mensagem */}
          <form onSubmit={handleSend} className="px-4 py-2 border-t border-border flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" title="Anexar">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem" />
            <Button type="submit" disabled={!text.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}