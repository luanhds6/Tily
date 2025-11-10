import { useEffect, useState } from "react";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import BrandLogo from "@/components/ui/BrandLogo";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, signIn, sendPasswordReset } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    const { error } = await signIn(email.trim(), password);
    if (error) setStatus(error.message);
  }

  async function onReset() {
    setStatus("");
    const { error } = await sendPasswordReset(email.trim());
    if (error) setStatus(error.message);
    else setStatus("Email de recuperação enviado, verifique sua caixa de entrada.");
  }

  useEffect(() => {
    if (!loading && user) {
      // Após autenticação, vá para a área interna do sistema
      navigate("/app", { replace: true });
    }
  }, [user, loading, navigate]);

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
        <div className="text-muted-foreground">Redirecionando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Marca Tily fixa: clicável, leva à página de apresentação enquanto não logado */}
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => navigate("/")} aria-label="Voltar para apresentação" className="focus:outline-none">
          <BrandLogo variant="wordmark" size={36} />
        </button>
      </div>
      {/* Fundo com imagem translúcida + gradiente suave */}
      <div className="absolute inset-0">
        <img src="/tily-login-bg.svg" alt="Fundo do sistema" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-cyan-50 opacity-80" />
      </div>
      <div className="relative w-full">
        <div className="max-w-md w-full mx-auto px-4">
          <Card className="p-8 rounded-2xl border border-border shadow-2xl bg-white/85 backdrop-blur-xl ring-1 ring-black/5">
            <div className="flex flex-col items-center text-center">
              <BrandLogo size={80} className="mb-3" />
              <p className="text-sm text-muted-foreground">Sistema de Chamados</p>
            </div>

            {status && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4 text-sm mt-4">
                {status}
              </div>
            )}

            <form onSubmit={onLogin} className="space-y-4 mt-6">
              <div>
                <Label className="mb-1">Email</Label>
                <Input className="rounded-xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label className="mb-1">Senha</Label>
                <Input className="rounded-xl" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full rounded-full">Entrar</Button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <Button variant="link" onClick={onReset} className="p-0 h-auto text-sm">Esqueci minha senha</Button>
              <span className="text-xs text-muted-foreground">Acesso restrito a usuários internos</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}