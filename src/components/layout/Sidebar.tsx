import React, { useEffect, useState } from "react";
import { Home, Ticket, Users, BarChart3, BookOpen, Settings, LogOut, Menu, X, UserCircle, MessageSquare, AlertCircle, Link as LinkIcon, Globe, FileText, Mail, Bookmark, ChevronUp, ChevronDown } from "lucide-react";
import { Session } from "../../hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import BrandLogo from "@/components/ui/BrandLogo";
import { supabase, isSupabaseEnabled, getCurrentCompany } from "@/lib/supabase";

interface SidebarProps {
  session: Session | null;
  view: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export function Sidebar({ session, view, onViewChange, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = session && (session.role === "master");
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
    let active = true;
    async function load() {
      // Quando Supabase habilitado, carregar da tabela quick_links por empresa
      if (isSupabaseEnabled && supabase) {
        try {
          const { data: company } = await getCurrentCompany();
          if (company?.id) {
            const { data, error } = await (supabase as any)
              .from("quick_links")
              .select("id,title,url,icon,created_at")
              .eq("company_id", company.id)
              .order("created_at", { ascending: false });
            if (!error && active) {
              const mapped: QuickLink[] = (data ?? []).map((row: any) => ({
                id: row.id,
                title: row.title,
                url: row.url,
                icon: row.icon || "link",
              }));
              setQuickLinks(mapped);
              try { localStorage.setItem(LS_QUICK_LINKS, JSON.stringify(mapped)); } catch {}
              return;
            }
          }
        } catch {}
      }
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(LS_QUICK_LINKS);
        setQuickLinks(raw ? (JSON.parse(raw) as QuickLink[]) : []);
      } catch {
        setQuickLinks([]);
      }
    }
    load();
    return () => { active = false; };
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
        <div className="flex flex-col items-center text-center gap-1">
          <BrandLogo variant="wordmark" size={34} tone="contrast" />
          {session && <p className="text-xs text-sidebar-foreground/70 truncate">{session.name}</p>}
        </div>
        {session && (
          <div className="mt-2 flex justify-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              session.role === "master" ? "bg-warning/10 text-warning" : 
              "bg-muted text-muted-foreground"
            }`}>
              {session.role === "master" ? "Master" : "Usuário"}
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
                <div className="mt-2 ml-4 mr-2 p-3 rounded-xl border border-white/50 bg-transparent shadow-soft min-h-[120px] max-h-[260px] overflow-y-auto">
                  {isAdmin && (
                    <div className="sticky top-0 pb-2">
                      <button
                        onClick={() => onViewChange("links")}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md text-xs bg-white/10 hover:bg-white/20"
                        title="Gerenciar links"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Gerenciar links</span>
                      </button>
                    </div>
                  )}
                  <ul className="space-y-1">
                    {quickLinks.length === 0 && (
                      <li className="text-xs text-sidebar-foreground/60 px-3 py-1.5">Nenhum link cadastrado</li>
                    )}
                    {quickLinks.map((l) => {
                      const IconComp = ICONS_MAP[(l.icon as keyof typeof ICONS_MAP) || "link"];
                      return (
                        <li key={l.id}>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
                            title={l.title}
                          >
                            <IconComp className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate text-sm">{l.title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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
            <div className="leading-tight">
              <BrandLogo variant="wordmark" size={26} tone="contrast" />
              {session && <p className="text-[11px] text-sidebar-foreground/70 truncate text-center">{session.name}</p>}
            </div>
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
