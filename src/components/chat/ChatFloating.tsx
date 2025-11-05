import React, { useEffect, useMemo, useRef, useState } from "react";
import { Session } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Paperclip, X, ImagePlus } from "lucide-react";
import { requestNotificationPermission, notify } from "@/hooks/useNotifications";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";

interface ChatFloatingProps {
  session: Session;
  users: Array<{ id: string; name: string; role: string }>;
}

interface AttachmentPreview {
  name: string;
  type: string;
  dataUrl: string;
  size?: number;
}

export function ChatFloating({ session, users }: ChatFloatingProps) {
  const isAdmin = session.role === "admin" || session.role === "master";
  const isUser = session.role === "user";
  const [open, setOpen] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string>("");
  const [search, setSearch] = useState("");

  const makeRoomId = (a: string, b: string) => [a, b].sort().join(":");
  const roomId = selectedPeerId ? makeRoomId(session.id, selectedPeerId) : "";
  const { messages, sendMessage, setRoomId } = useChat(roomId);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useNotificationCenter();

  useEffect(() => {
    if (open) requestNotificationPermission();
  }, [open]);

  useEffect(() => {
    setRoomId(roomId);
  }, [roomId, setRoomId]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, open]);

  // Notifica quando chega mensagem de outra pessoa
  const lastMsg = useMemo(() => messages[messages.length - 1], [messages]);
  useEffect(() => {
    if (open && lastMsg && lastMsg.senderId !== session.id && lastMsg.senderId !== "system") {
      notify("Nova mensagem no chat de suporte", { body: `${lastMsg.senderName}: ${(lastMsg.text || "").slice(0, 120)}` });
      addNotification({ title: "Nova mensagem no chat", body: `${lastMsg.senderName}: ${(lastMsg.text || "").slice(0, 160)}`, category: "chat" });
    }
  }, [lastMsg, session.id, open]);

  // Se suporte fechar, reset para usuário
  useEffect(() => {
    if (isUser && lastMsg && lastMsg.senderId === "system" && /Conversa finalizada/.test(lastMsg.text || "")) {
      setSelectedAgentId("");
      setRoomId("");
    }
  }, [isUser, lastMsg, setRoomId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && attachments.length === 0) || !roomId) return;
    sendMessage(session.id, session.name, text.trim(), attachments);
    setText("");
    setAttachments([]);
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleFiles = (files: FileList) => {
    const arr = Array.from(files);
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [...prev, { name: file.name, type: file.type, dataUrl: String(reader.result), size: file.size }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) handleFiles({ 0: file, length: 1, item: (i: number) => file } as any);
      }
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Lista de contatos: qualquer usuário cadastrado, exceto o próprio
  const contactsList = users.filter((u) => u.id !== session.id);
  const filteredContacts = useMemo(
    () =>
      contactsList.filter((u) =>
        (u.name || "").toLowerCase().includes(search.trim().toLowerCase())
      ),
    [contactsList, search]
  );

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setOpen((v) => !v)} className="shadow-soft">
          <MessageSquare className="w-4 h-4 mr-2" />
          {open ? "Fechar chat" : "Chat"}
        </Button>
      </div>

      {/* Painel flutuante */}
      {open && (
        <Card className="fixed bottom-20 right-4 z-50 w-[780px] h-[520px] border border-border shadow-large bg-card flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="font-semibold">Chat de Suporte</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Duas colunas */}
          <div className="flex flex-1 min-h-0">
            {/* Esquerda: contatos internos */}
            <div className="w-64 border-r border-border p-3 overflow-y-auto">
              <div className="text-xs text-muted-foreground mb-2">Contatos</div>
              <div className="mb-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquise pelo nome..."
                />
              </div>
              <div className="space-y-1">
                {filteredContacts.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedPeerId(u.id)}
                    className={`w-full text-left px-2 py-2 rounded-md border ${selectedPeerId === u.id ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50 border-transparent"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        {u.avatar ? (
                          <AvatarImage src={u.avatar} alt={u.name} />
                        ) : (
                          <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-1">{u.name}</div>
                        <div className="text-xs text-muted-foreground">Conversa interna</div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2">Nenhum contato encontrado</div>
                )}
              </div>
            </div>

            {/* Direita: chat */}
            <div className="flex-1 flex flex-col">
              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => {
                  const mine = m.senderId === session.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-lg p-3 text-sm shadow-soft border ${
                          mine ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-foreground border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!mine && m.senderId !== "system" && (
                            <Avatar className="w-6 h-6">
                              {users.find((u) => u.id === m.senderId)?.avatar ? (
                                <AvatarImage src={users.find((u) => u.id === m.senderId)!.avatar!} alt={m.senderName} />
                              ) : (
                                <AvatarFallback>{getInitials(m.senderName)}</AvatarFallback>
                              )}
                            </Avatar>
                          )}
                          <span className="font-medium">{m.senderId === "system" ? "Sistema" : mine ? "Você" : m.senderName}</span>
                          <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                        </div>
                        {m.text && (
                          <div className={`whitespace-pre-wrap mb-2 ${m.senderId === "system" ? "text-muted-foreground" : ""}`}>{m.text}</div>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {m.attachments.map((a, idx) => (
                              <div key={idx} className="border border-border rounded-md overflow-hidden bg-background">
                                {a.type.startsWith("image/") ? (
                                  <img src={a.dataUrl} alt={a.name} className="max-w-[180px] max-h-[180px] object-contain" />
                                ) : (
                                  <div className="flex items-center gap-2 px-2 py-1 text-xs">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="line-clamp-1">{a.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-border" onPaste={onPaste}>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((a, idx) => (
                      <div key={idx} className="relative">
                        {a.type.startsWith("image/") ? (
                          <img src={a.dataUrl} alt={a.name} className="w-20 h-20 object-cover rounded-md border border-border" />
                        ) : (
                          <div className="w-40 h-20 flex items-center justify-center rounded-md border border-border bg-muted/30 text-xs px-2 text-center">
                            <Paperclip className="w-3 h-3 mr-1" /> {a.name}
                          </div>
                        )}
                        <button type="button" className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow-soft" onClick={() => removeAttachment(idx)}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={"Selecione um contato e digite... (cole imagens aqui)"} disabled={!selectedPeerId} />
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} title="Anexar arquivos">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button type="submit" disabled={(!text.trim() && attachments.length === 0) || !roomId}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                  {isAdmin && selectedPeerId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Suporte finaliza conversa: mensagem de sistema e limpa seleção
                        sendMessage("system", "Sistema", `Conversa finalizada por ${session.name}.`);
                        setSelectedPeerId("");
                        setRoomId("");
                      }}
                    >
                      Finalizar conversa
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ImagePlus className="w-3 h-3" /> Dica: cole prints com Ctrl+V diretamente aqui.
                </div>
              </form>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}