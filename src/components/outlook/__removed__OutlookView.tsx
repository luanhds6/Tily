import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, LogIn, LogOut, RefreshCw } from "lucide-react";
import { msalApp, MSAL_SCOPES, isMsalConfigured, initMsal } from "@/lib/msal";

type OutlookMessage = {
  id: string;
  subject: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
};

export default function OutlookView() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<OutlookMessage[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await initMsal();
        const accounts = msalApp.getAllAccounts();
        setLoggedIn(accounts.length > 0);
      } catch (e: any) {
        setError(e?.message || "Falha ao iniciar MSAL");
      }
    })();
  }, []);

  async function login() {
    setError(null);
    try {
      await initMsal();
      await msalApp.loginPopup({ scopes: MSAL_SCOPES });
      setLoggedIn(true);
      await loadMessages();
    } catch (e: any) {
      setError(e?.message || "Falha ao autenticar");
    }
  }

  async function logout() {
    await initMsal();
    const accounts = msalApp.getAllAccounts();
    if (accounts.length === 0) { setLoggedIn(false); return; }
    try {
      await msalApp.logoutPopup({ account: accounts[0] });
      setLoggedIn(false);
      setMessages([]);
    } catch (e: any) {
      setError(e?.message || "Falha ao sair");
    }
  }

  async function acquireToken() {
    await initMsal();
    const accounts = msalApp.getAllAccounts();
    if (accounts.length === 0) throw new Error("Não autenticado");
    const account = accounts[0];
    try {
      const res = await msalApp.acquireTokenSilent({ account, scopes: MSAL_SCOPES });
      return res.accessToken;
    } catch {
      const res = await msalApp.acquireTokenPopup({ account, scopes: MSAL_SCOPES });
      return res.accessToken;
    }
  }

  async function loadMessages() {
    setBusy(true); setError(null);
    try {
      if (!isMsalConfigured()) throw new Error("Configure VITE_MSAL_CLIENT_ID nas variáveis de ambiente.");
      const token = await acquireToken();
      const resp = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=12&$select=subject,from,receivedDateTime,bodyPreview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Graph ${resp.status}`);
      const data = await resp.json();
      setMessages(data.value || []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar emails");
    } finally { setBusy(false); }
  }

  const filtered = messages.filter(m => (m.subject || "").toLowerCase().includes(search.toLowerCase()) || (m.bodyPreview || "").toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-7 h-7 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Outlook</h1>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="flex-1 min-w-[220px]" placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
          {loggedIn ? (
            <>
              <Button variant="outline" onClick={loadMessages} disabled={busy} title="Atualizar"><RefreshCw className="w-4 h-4 mr-2" /> Atualizar</Button>
              <Button variant="destructive" onClick={logout} title="Sair"><LogOut className="w-4 h-4 mr-2" /> Sair</Button>
            </>
          ) : (
            <Button onClick={login} title="Entrar"><LogIn className="w-4 h-4 mr-2" /> Conectar Microsoft</Button>
          )}
        </div>
        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
      </Card>

      <Card className="p-4">
        {!loggedIn ? (
          <div className="text-sm text-muted-foreground">Conecte sua conta Microsoft para visualizar seus emails do Outlook.</div>
        ) : (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum email encontrado.</div>
            )}
            {filtered.map(m => (
              <div key={m.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{m.subject || "(sem assunto)"}</div>
                  <div className="text-xs text-muted-foreground">{m.receivedDateTime ? new Date(m.receivedDateTime).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{m.from?.emailAddress?.name} &lt;{m.from?.emailAddress?.address}&gt;</div>
                <div className="text-sm mt-1 line-clamp-3">{m.bodyPreview}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
