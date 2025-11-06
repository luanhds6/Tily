import { useState } from "react";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Ticket } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading, signIn, signUp, signOut, sendPasswordReset, isAdmin, isMaster } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    const { error } = await signIn(email.trim(), password);
    if (error) setStatus(error.message);
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    const { error } = await signUp(email.trim(), password, { full_name: fullName });
    if (error) setStatus(error.message);
    else setStatus("Cadastro realizado. Verifique seu email para confirmar.");
  }

  async function onReset() {
    setStatus("");
    const { error } = await sendPasswordReset(email.trim());
    if (error) setStatus(error.message);
    else setStatus("Email de recuperação enviado, verifique sua caixa de entrada.");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-lg w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tily</h1>
              <p className="text-xs text-muted-foreground">Sistema de Chamados</p>
            </div>
          </div>
          <h2 className="text-lg font-semibold">Você está autenticado</h2>
          <p className="text-sm text-muted-foreground mt-1">Email: {user.email}</p>
          <div className="mt-4 text-sm">
            <div>Perfil: {profile ? profile.full_name ?? "(sem nome)" : "(não encontrado)"}</div>
            {profile && <div className="mt-1">Empresa: {profile.company_id}</div>}
            <div className="mt-1">Acesso: {isMaster ? "Master" : isAdmin ? "Admin" : "Usuário"}</div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={() => navigate("/")} className="flex-1">
              Ir para o sistema
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  const { error } = await signOut();
                  if (error) {
                    console.error("Erro ao sair:", error.message);
                  }
                  navigate("/login", { replace: true });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center lg:pt-0 pt-16">
      <div className="max-w-md w-full mx-4">
        <Card className="p-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Ticket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tily</h1>
              <p className="text-xs text-muted-foreground text-center">Sistema de Chamados</p>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-center mt-2">Acesso</h2>
          {status && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4 text-sm mt-3">
              {status}
            </div>
          )}
          <form onSubmit={onLogin} className="space-y-3 mt-4">
            <div>
              <Label className="mb-1">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label className="mb-1">Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Entrar</Button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-medium">Ainda não tem conta?</h3>
            <form onSubmit={onSignup} className="space-y-3 mt-2">
              <div>
                <Label className="mb-1">Nome completo</Label>
                <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <Button variant="outline" type="submit" className="w-full">Cadastrar</Button>
            </form>
          </div>

          <div className="mt-4">
            <Button variant="link" onClick={onReset} className="p-0 h-auto text-sm">Esqueci minha senha</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}