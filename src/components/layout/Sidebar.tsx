import React, { useEffect, useState } from "react";
import { Home, Ticket, Users, BarChart3, BookOpen, Settings, LogOut, Menu, X, UserCircle, MessageSquare, AlertCircle, Link as LinkIcon, Globe, FileText, Mail, Bookmark, ChevronUp, ChevronDown } from "lucide-react";
import { Session } from "../../hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";

interface SidebarProps {
  session: Session | null;
  view: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export function Sidebar({ session, view, onViewChange, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = session && (session.role === "admin" || session.role === "master");
  const isMaster = session && session.role === "master";
  const access = useAccessControl(session || null);

  type QuickLink = {
    id: string;
    title: string;
    url: string;
    icon: string;
  };

  const LS_QUICK_LINKS = "sc_quick_links_v1";
  const ICONS_MAP = {
    link: LinkIcon,
    globe: Globe,
    file: FileText,
    user: UserCircle,
    settings: Settings,
    mail: Mail,
    bookmark: Bookmark,
  } as const;

  const [linksOpen, setLinksOpen] = useState(false);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QUICK_LINKS);
      setQuickLinks(raw ? (JSON.parse(raw) as QuickLink[]) : []);
    } catch {
      setQuickLinks([]);
    }
  }, []);

  const perms = access?.perms?.permissions || {} as Record<string, boolean>;
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, show: !!perms["dashboard"] },
    { id: "chamados", label: "Chamados", icon: Ticket, show: !!perms["tickets"] },
    { id: "chat", label: "Chat", icon: MessageSquare, show: !!perms["chat"] },
    { id: "informativos", label: "Informativos", icon: AlertCircle, show: !!perms["informativos"] },
    { id: "links", label: "Links Úteis", icon: LinkIcon, show: !!perms["quick_links"] },
    { id: "analytics", label: "Relatórios", icon: BarChart3, show: isAdmin || !!perms["analytics"] },
    { id: "knowledge", label: "Base de Conhecimento", icon: BookOpen, show: !!perms["knowledge"] },
    // Agrupamento: para Admin/Master, esconder "Usuários" e "Perfil" e usar apenas "Configurações"
    { id: "users", label: "Usuários", icon: Users, show: !!isMaster && !isAdmin },
    { id: "profile", label: "Perfil", icon: UserCircle, show: !!perms["profile"] && !isAdmin },
    { id: "settings", label: "Configurações", icon: Settings, show: isAdmin || !!perms["settings"] },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === "links") {
      setLinksOpen((o) => !o);
    } else {
      onViewChange(itemId);
    }
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Ticket className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Chamados TI</h1>
            {session && <p className="text-xs text-sidebar-foreground/60 truncate">{session.name}</p>}
          </div>
        </div>
        {session && (
          <div className="mt-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              session.role === "master" ? "bg-warning/10 text-warning" : 
              session.role === "admin" ? "bg-primary/10 text-primary" : 
              "bg-muted text-muted-foreground"
            }`}>
              {session.role === "master" ? "Master" : session.role === "admin" ? "Admin" : "Usuário"}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.filter(item => item.show).map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  (view === item.id && item.id !== "links") || (item.id === "links" && linksOpen)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
                {item.id === "links" && (
                  linksOpen ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronUp className="w-4 h-4 ml-auto" />
                  )
                )}
              </button>
              {item.id === "links" && linksOpen && (
                <ul className="mt-1 ml-8 space-y-1">
                  {quickLinks.length === 0 && (
                    <li className="text-xs text-sidebar-foreground/60 px-4">Nenhum link cadastrado</li>
                  )}
                  {quickLinks.map((l) => {
                    const IconComp = ICONS_MAP[(l.icon as keyof typeof ICONS_MAP) || "link"];
                    return (
                      <li key={l.id}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-2 px-4 py-2 rounded-md transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          title={l.title}
                        >
                          <IconComp className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate text-sm">{l.title}</span>
                        </a>
                      </li>
                    );
                  })}
                  {isAdmin && (
                    <li>
                      <button
                        onClick={() => onViewChange("links")}
                        className="w-full flex items-center gap-2 px-4 py-2 rounded-md text-xs bg-sidebar-accent/30 hover:bg-sidebar-accent/50"
                        title="Gerenciar links"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Gerenciar links</span>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border sticky bottom-0 bg-sidebar z-10">
        <button
          onClick={async () => {
            if (loggingOut) return;
            setLoggingOut(true);
            try {
              await onLogout();
            } finally {
              setLoggingOut(false);
            }
          }}
          disabled={loggingOut}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
            loggingOut
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{loggingOut ? "Saindo..." : "Sair"}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              aria-label="Alternar menu"
              title="Alternar menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6 text-sidebar-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-sidebar-foreground" />
              )}
            </button>
            <Ticket className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-sidebar-foreground">Chamados TI</h1>
          </div>
          {/* Espaço reservado para ações à direita (vazio para evitar conflito com sino) */}
          <div className="w-6" />
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col w-64 bg-sidebar text-sidebar-foreground min-h-screen shadow-medium">
        <SidebarContent />
      </div>
    </>
  );
}
