import React, { useEffect, useState, useRef } from "react";
import { Ticket, Users, Home, LogOut, AlertCircle, CheckCircle, Clock, FileText, Paperclip, Send, X, Filter, Search, Plus, Settings } from "lucide-react";

// SISTEMA DE CHAMADOS TI - Gestão completa de tickets com autenticação
// Storage helpers (localStorage para demo)
const LS_USERS = "sc_users_v1";
const LS_TICKETS = "sc_tickets_v1";
const LS_SESSION = "sc_session_v1";

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

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Inicializar dados demo
function ensureSeedData() {
  const users = loadJSON(LS_USERS, null);
  if (!users) {
    const master = {
      id: uid("u"),
      name: "Admin Master",
      email: "master@local",
      password: "master123",
      role: "master",
      active: true,
    };
    const sampleAdmin = {
      id: uid("u"),
      name: "Admin TI",
      email: "admin@local",
      password: "admin123",
      role: "admin",
      active: true,
    };
    const sampleUser = {
      id: uid("u"),
      name: "João Usuário",
      email: "joao@local",
      password: "user123",
      role: "user",
      active: true,
    };
    saveJSON(LS_USERS, [master, sampleAdmin, sampleUser]);
  }
  const tickets = loadJSON(LS_TICKETS, null);
  if (!tickets) {
    saveJSON(LS_TICKETS, []);
  }
}

// Components UI
function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) {
  const variants: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, variant = "default" }: any) {
  const variants: Record<string, string> = {
    default: "bg-card border-border",
    primary: "bg-primary/5 border-primary/20",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
  };
  return (
    <div className={`rounded-lg border p-6 shadow-soft ${variants[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-10 h-10 text-primary opacity-20" />
      </div>
    </div>
  );
}

export default function SistemaChamadosTI() {
  ensureSeedData();

  const [users, setUsers] = useState(() => loadJSON(LS_USERS, []));
  const [tickets, setTickets] = useState(() => loadJSON(LS_TICKETS, []));
  const [session, setSession] = useState(() => loadJSON(LS_SESSION, null));

  useEffect(() => saveJSON(LS_USERS, users), [users]);
  useEffect(() => saveJSON(LS_TICKETS, tickets), [tickets]);
  useEffect(() => saveJSON(LS_SESSION, session), [session]);

  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState({ status: "all", priority: "all", query: "" });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Auth
  function login(email: string, password: string) {
    const u = users.find((x: any) => x.email === email && x.password === password && x.active);
    if (u) {
      setSession({ id: u.id, name: u.name, email: u.email, role: u.role });
      return true;
    }
    return false;
  }

  function logout() {
    setSession(null);
    setView("dashboard");
  }

  // User management (Master only)
  function createUser({ name, email, password, role = "user" }: any) {
    if (!session || session.role !== "master") throw new Error("Apenas Master pode criar usuários");
    if (users.some((u: any) => u.email === email)) throw new Error("Email já cadastrado");
    const nu = { id: uid("u"), name, email, password, role, active: true };
    setUsers((s: any) => [nu, ...s]);
    return nu;
  }

  function updateUser(id: string, changes: any) {
    if (!session || session.role !== "master") throw new Error("Apenas Master pode editar usuários");
    setUsers((s: any) => s.map((u: any) => (u.id === id ? { ...u, ...changes } : u)));
  }

  function deleteUser(id: string) {
    if (!session || session.role !== "master") throw new Error("Apenas Master pode excluir usuários");
    if (!confirm("Confirmar exclusão do usuário?")) return;
    setUsers((s: any) => s.filter((u: any) => u.id !== id));
  }

  // Tickets
  function createTicket({ title, description, category = "Geral", priority = "Média", attachments = [] }: any) {
    if (!session) throw new Error("Usuário precisa estar logado");
    const ticket = {
      id: uid("t"),
      authorId: session.id,
      authorName: session.name,
      title,
      description,
      category,
      priority,
      status: "Aberto",
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: uid("m"),
          authorId: session.id,
          authorName: session.name,
          text: description,
          attachments,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setTickets((s: any) => [ticket, ...s]);
    setView("meus");
    return ticket;
  }

  function addMessage(ticketId: string, { text, attachments = [] }: any) {
    if (!session) throw new Error("Precisa estar logado");
    setTickets((s: any) =>
      s.map((t: any) =>
        t.id === ticketId
          ? {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: uid("m"),
                  authorId: session.id,
                  authorName: session.name,
                  text,
                  attachments,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t
      )
    );
  }

  function setTicketStatus(ticketId: string, status: string) {
    if (!session || (session.role !== "admin" && session.role !== "master"))
      throw new Error("Apenas admins podem alterar status");
    setTickets((s: any) => s.map((t: any) => (t.id === ticketId ? { ...t, status } : t)));
  }

  const myTickets = tickets.filter((t: any) => session && t.authorId === session.id);
  const allTickets = tickets;

  function filteredTickets(list: any[]) {
    return list.filter((t: any) => {
      if (filter.status !== "all" && t.status !== filter.status) return false;
      if (filter.priority !== "all" && t.priority !== filter.priority) return false;
      if (filter.query) {
        const q = filter.query.toLowerCase();
        if (
          !(
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.messages.some((m: any) => m.text.toLowerCase().includes(q))
          )
        )
          return false;
      }
      return true;
    });
  }

  function fileToDataUrl(file: File): Promise<any> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res({ name: file.name, type: file.type, dataUrl: reader.result });
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  // Components
  function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e: React.FormEvent) {
      e.preventDefault();
      const ok = login(email.trim(), password);
      if (!ok) setErr("Credenciais inválidas ou usuário desativado");
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card rounded-lg shadow-medium p-8 border border-border">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Ticket className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Sistema de Chamados TI</h2>
              <p className="text-sm text-muted-foreground mt-1">Faça login para continuar</p>
            </div>
            {err && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4 text-sm">
                {err}
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("master@local");
                  setPassword("master123");
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Preencher credenciais demo (master@local)
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Demo: use <strong>master@local/master123</strong> (Master), <strong>admin@local/admin123</strong> (Admin) ou <strong>joao@local/user123</strong> (User)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Sidebar() {
    const isAdmin = session && (session.role === "admin" || session.role === "master");
    const isMaster = session && session.role === "master";

    return (
      <div className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col shadow-medium">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Ticket className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Chamados TI</h1>
              {session && <p className="text-xs text-sidebar-foreground/60">{session.name}</p>}
            </div>
          </div>
          {session && (
            <div className="mt-3">
              <Badge variant={session.role === "master" ? "warning" : session.role === "admin" ? "primary" : "default"}>
                {session.role === "master" ? "Master" : session.role === "admin" ? "Admin" : "Usuário"}
              </Badge>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setView("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  view === "dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("meus")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  view === "meus" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Meus Chamados</span>
              </button>
            </li>
            {isAdmin && (
              <li>
                <button
                  onClick={() => setView("todos")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    view === "todos" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Ticket className="w-5 h-5" />
                  <span className="font-medium">Todos Chamados</span>
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => setView("new")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  view === "new" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Novo Chamado</span>
              </button>
            </li>
            {isMaster && (
              <li>
                <button
                  onClick={() => setView("users")}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    view === "users" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Usuários</span>
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    );
  }

  function TicketList({ list, onSelect }: any) {
    const items = filteredTickets(list);

    const getPriorityColor = (priority: string) => {
      if (priority === "Alta") return "danger";
      if (priority === "Média") return "warning";
      return "default";
    };

    const getStatusColor = (status: string) => {
      if (status === "Aberto") return "primary";
      if (status === "Em Progresso") return "warning";
      if (status === "Resolvido") return "success";
      return "default";
    };

    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                placeholder="Buscar chamados..."
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
                className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">Todos status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em Progresso">Em Progresso</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Fechado">Fechado</option>
            </select>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">Todas prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-soft divide-y divide-border">
          {items.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum chamado encontrado</p>
            </div>
          )}
          {items.map((t: any) => (
            <div
              key={t.id}
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedTicketId(t.id);
                setView("detail");
                if (onSelect) onSelect(t);
              }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{t.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{t.authorName}</span>
                    <span>•</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                    <span>•</span>
                    <span>{t.category}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant={getPriorityColor(t.priority)}>{t.priority}</Badge>
                  <Badge variant={getStatusColor(t.status)}>{t.status}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function TicketDetail({ ticketId }: any) {
    const ticket = tickets.find((t: any) => t.id === ticketId);
    const [reply, setReply] = useState("");
    const [replyFiles, setReplyFiles] = useState<any[]>([]);

    if (!ticket) return <div className="p-8 text-center text-muted-foreground">Chamado não encontrado</div>;

    async function handleReply(e: React.FormEvent) {
      e.preventDefault();
      if (!reply && replyFiles.length === 0) return;
      addMessage(ticketId, { text: reply, attachments: replyFiles });
      if (session.role === "admin" || session.role === "master") {
        if (ticket.status === "Aberto") setTicketStatus(ticketId, "Em Progresso");
      }
      setReply("");
      setReplyFiles([]);
    }

    async function onFilesChange(ev: any) {
      const files = Array.from(ev.target.files || []);
      const conv = await Promise.all(files.map((f: any) => fileToDataUrl(f)));
      setReplyFiles((s) => [...s, ...conv]);
    }

    const getPriorityColor = (priority: string) => {
      if (priority === "Alta") return "danger";
      if (priority === "Média") return "warning";
      return "default";
    };

    const getStatusColor = (status: string) => {
      if (status === "Aberto") return "primary";
      if (status === "Em Progresso") return "warning";
      if (status === "Resolvido") return "success";
      return "default";
    };

    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{ticket.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>#{ticket.id.slice(0, 8)}</span>
                <span>•</span>
                <span>{ticket.category}</span>
                <span>•</span>
                <span>Criado por {ticket.authorName}</span>
                <span>•</span>
                <span>{new Date(ticket.createdAt).toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={getPriorityColor(ticket.priority)}>Prioridade: {ticket.priority}</Badge>
              <Badge variant={getStatusColor(ticket.status)}>{ticket.status}</Badge>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-soft">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Histórico de Mensagens
            </h3>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {ticket.messages.map((m: any) => (
              <div key={m.id} className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-foreground">{m.authorName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{m.text}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {m.attachments.map((att: any, i: number) => (
                      <AttachmentPreview key={i} att={att} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {session && (session.role === "admin" || session.role === "master" || session.id === ticket.authorId) && (
            <div className="p-4 border-t border-border">
              <form onSubmit={handleReply} className="space-y-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="w-full border border-input bg-background px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input hover:bg-muted/50 transition-colors text-sm">
                      <Paperclip className="w-4 h-4" />
                      <span>Anexar arquivo</span>
                      <input type="file" multiple onChange={onFilesChange} className="hidden" />
                    </label>
                    {replyFiles.length > 0 && (
                      <span className="text-sm text-muted-foreground">{replyFiles.length} arquivo(s)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(session.role === "admin" || session.role === "master") && (
                      <select
                        onChange={(e) => setTicketStatus(ticketId, e.target.value)}
                        value={ticket.status}
                        className="border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Em Progresso">Em Progresso</option>
                        <option value="Resolvido">Resolvido</option>
                        <option value="Fechado">Fechado</option>
                      </select>
                    )}
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Enviar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  function AttachmentPreview({ att }: any) {
    return (
      <div className="relative group w-24 h-24 border border-border rounded-lg overflow-hidden bg-muted">
        {att.type && att.type.startsWith("image/") ? (
          <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
            <Paperclip className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground truncate w-full">{att.name}</span>
          </div>
        )}
      </div>
    );
  }

  function NewTicketForm() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Geral");
    const [priority, setPriority] = useState("Média");
    const [files, setFiles] = useState<any[]>([]);

    const pasteRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      const el = pasteRef.current;
      if (!el) return;
      function onPaste(e: any) {
        const items = e.clipboardData && e.clipboardData.items ? Array.from(e.clipboardData.items) : [];
        const imageItems = items.filter((it: any) => it.type && it.type.startsWith("image"));
        if (imageItems.length === 0) return;
        Promise.all(
          imageItems.map(
            (it: any) =>
              new Promise((res) => {
                const file = it.getAsFile();
                const reader = new FileReader();
                reader.onload = () =>
                  res({ name: file.name || "clipboard-image.png", type: file.type, dataUrl: reader.result });
                reader.readAsDataURL(file);
              })
          )
        ).then((arr) => setFiles((s) => [...s, ...arr]));
      }
      el.addEventListener("paste", onPaste);
      return () => el.removeEventListener("paste", onPaste);
    }, []);

    async function onSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!session) return alert("Faça login para criar chamado");
      if (!title || !description) return alert("Preencha título e descrição");
      createTicket({ title, description, category, priority, attachments: files });
      setTitle("");
      setDescription("");
      setFiles([]);
      setView("meus");
    }

    async function onFileChange(e: any) {
      const fs = Array.from(e.target.files || []);
      const conv = await Promise.all(fs.map((f: any) => fileToDataUrl(f)));
      setFiles((s) => [...s, ...conv]);
    }

    return (
      <div className="max-w-3xl">
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Plus className="w-6 h-6 text-primary" />
            Novo Chamado
          </h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Título</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva o problema brevemente"
                className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Geral</option>
                  <option>Rede</option>
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
              <textarea
                ref={pasteRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema detalhadamente. Você pode colar screenshots diretamente aqui (Ctrl+V) ou usar o botão anexar."
                className="w-full border border-input bg-background px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px] resize-none"
                required
              />
            </div>
            {files.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <AttachmentPreview att={f} />
                    <button
                      type="button"
                      onClick={() => setFiles((s) => s.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-4">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-muted/50 transition-colors">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm font-medium">Anexar arquivos</span>
                <input type="file" multiple onChange={onFileChange} className="hidden" />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Abrir Chamado
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function UsersManagement() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");

    function onCreate(e: React.FormEvent) {
      e.preventDefault();
      try {
        createUser({ name, email, password, role });
        setName("");
        setEmail("");
        setPassword("");
        setRole("user");
      } catch (err: any) {
        alert(err.message);
      }
    }

    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Criar Novo Usuário
          </h3>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome completo</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Perfil</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-input bg-background px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-success text-success-foreground rounded-lg font-medium hover:bg-success/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Criar Usuário
            </button>
          </form>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-soft">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Usuários
            </h3>
          </div>
          <div className="divide-y divide-border">
            {users.map((u: any) => (
              <div key={u.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{u.name}</span>
                      <Badge
                        variant={
                          u.role === "master" ? "warning" : u.role === "admin" ? "primary" : "default"
                        }
                      >
                        {u.role === "master" ? "Master" : u.role === "admin" ? "Admin" : "Usuário"}
                      </Badge>
                      {!u.active && <Badge variant="danger">Desativado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{u.email}</p>
                  </div>
                  {u.role !== "master" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        className="px-3 py-1.5 border border-input rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => {
                          const newRole = u.role === "admin" ? "user" : "admin";
                          updateUser(u.id, { role: newRole });
                        }}
                        className="px-3 py-1.5 border border-input rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors"
                      >
                        Trocar perfil
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="px-3 py-1.5 border border-destructive/20 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function Dashboard() {
    const openTickets = tickets.filter((t: any) => t.status === "Aberto").length;
    const inProgressTickets = tickets.filter((t: any) => t.status === "Em Progresso").length;
    const resolvedTickets = tickets.filter((t: any) => t.status === "Resolvido").length;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de chamados</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Ticket} label="Total de Chamados" value={tickets.length} variant="primary" />
          <StatCard icon={AlertCircle} label="Abertos" value={openTickets} variant="primary" />
          <StatCard icon={Clock} label="Em Progresso" value={inProgressTickets} variant="warning" />
          <StatCard icon={CheckCircle} label="Resolvidos" value={resolvedTickets} variant="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
            <h3 className="font-semibold text-foreground mb-4">Meus Chamados Recentes</h3>
            {myTickets.slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum chamado encontrado</p>
            ) : (
              <div className="space-y-2">
                {myTickets.slice(0, 5).map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setView("detail");
                    }}
                  >
                    <div className="font-medium text-sm text-foreground truncate">{t.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={t.status === "Aberto" ? "primary" : "default"}>{t.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(session?.role === "admin" || session?.role === "master") && (
            <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
              <h3 className="font-semibold text-foreground mb-4">Chamados por Prioridade</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive"></div>
                    <span className="text-sm">Alta</span>
                  </div>
                  <span className="font-semibold">
                    {tickets.filter((t: any) => t.priority === "Alta").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning"></div>
                    <span className="text-sm">Média</span>
                  </div>
                  <span className="font-semibold">
                    {tickets.filter((t: any) => t.priority === "Média").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted"></div>
                    <span className="text-sm">Baixa</span>
                  </div>
                  <span className="font-semibold">
                    {tickets.filter((t: any) => t.priority === "Baixa").length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        {view === "dashboard" && <Dashboard />}
        {view === "meus" && <TicketList list={myTickets} onSelect={(t: any) => {}} />}
        {view === "todos" && <TicketList list={allTickets} />}
        {view === "detail" && selectedTicketId && <TicketDetail ticketId={selectedTicketId} />}
        {view === "new" && <NewTicketForm />}
        {view === "users" && session.role === "master" && <UsersManagement />}
      </main>
    </div>
  );
}
