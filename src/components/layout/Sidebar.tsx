import React, { useState } from "react";
import { Home, Ticket, Users, BarChart3, BookOpen, Settings, LogOut, Menu, X, UserCircle, MessageSquare, AlertCircle } from "lucide-react";
import { Session } from "../../hooks/useAuth";

interface SidebarProps {
  session: Session | null;
  view: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export function Sidebar({ session, view, onViewChange, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session && (session.role === "admin" || session.role === "master");
  const isMaster = session && session.role === "master";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, show: true },
    { id: "chamados", label: "Chamados", icon: Ticket, show: true },
    { id: "chat", label: "Chat", icon: MessageSquare, show: true },
    { id: "informativos", label: "Informativos", icon: AlertCircle, show: true },
    { id: "analytics", label: "Relatórios", icon: BarChart3, show: isAdmin },
    { id: "knowledge", label: "Base de Conhecimento", icon: BookOpen, show: true },
    { id: "users", label: "Usuários", icon: Users, show: isMaster },
    { id: "profile", label: "Perfil", icon: UserCircle, show: true },
    { id: "settings", label: "Configurações", icon: Settings, show: isAdmin },
  ];

  const handleNavClick = (itemId: string) => {
    onViewChange(itemId);
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
                  view === item.id 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft" 
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border sticky bottom-0 bg-sidebar z-10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-sidebar-foreground">Chamados TI</h1>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-sidebar-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-sidebar-foreground" />
            )}
          </button>
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
