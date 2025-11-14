import React, { useEffect, useState } from "react";
import { Settings, Bell, Palette, Globe, Shield, Database } from "lucide-react";

export function SettingsView() {
  const [notifications, setNotifications] = useState({
    email: true,
    desktop: false,
    newTicket: true,
    statusChange: true,
    mentions: true,
  });

  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("pt-BR");
  // Integração Outlook removida

  useEffect(() => {
    // sem MSAL/Outlook
  }, []);

  // funções de conexão Outlook removidas

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Personalize o sistema de acordo com suas preferências</p>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notificações
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notificações por Email</p>
              <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Notificações Desktop</p>
              <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.desktop}
                onChange={(e) => setNotifications({ ...notifications, desktop: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Novos Chamados</p>
              <p className="text-sm text-muted-foreground">Quando um novo chamado for criado</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.newTicket}
                onChange={(e) => setNotifications({ ...notifications, newTicket: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Mudanças de Status</p>
              <p className="text-sm text-muted-foreground">Quando o status de um chamado mudar</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.statusChange}
                onChange={(e) => setNotifications({ ...notifications, statusChange: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Aparência
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tema</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full sm:w-auto border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Idioma e Região
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Idioma</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full sm:w-auto border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integração Outlook removida */}

      {/* Security */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Segurança
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Sessão Automática</p>
              <p className="text-sm text-muted-foreground">Deslogar após 30 minutos de inatividade</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors text-sm">
            Histórico de Logins
          </button>
        </div>
      </div>

      {/* Data & Storage */}
      <div className="bg-card border border-border rounded-lg shadow-soft">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Dados e Armazenamento
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Armazenamento Usado</p>
              <p className="text-sm text-muted-foreground">2.3 MB de 100 MB</p>
            </div>
            <div className="w-32 h-2 bg-muted rounded-full">
              <div className="h-full w-[2.3%] bg-primary rounded-full" />
            </div>
          </div>
          <button className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm">
            Limpar Cache
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}
