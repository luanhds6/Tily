import { useState } from "react";
import { useSupabaseAuth } from "../hooks/useSupabaseAuth";
import { Link } from "react-router-dom";

export default function Login() {
  const { user, profile, loading, signIn, signUp, signOut, sendPasswordReset, isAdmin, isMaster } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<string>("");

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
        <div className="max-w-lg w-full mx-4 bg-card rounded-lg shadow-medium p-6 border border-border">
          <h2 className="text-xl font-semibold">Você está autenticado</h2>
          <p className="text-sm text-muted-foreground mt-1">Email: {user.email}</p>
          <div className="mt-4 text-sm">
            <div>Perfil: {profile ? profile.full_name ?? "(sem nome)" : "(não encontrado)"}</div>
            {profile && (
              <div className="mt-1">Empresa: {profile.company_id}</div>
            )}
            <div className="mt-1">Acesso: {isMaster ? "Master" : isAdmin ? "Admin" : "Usuário"}</div>
          </div>
          <div className="mt-6 flex gap-2">
            <Link to="/" className="px-4 py-2 rounded bg-primary text-primary-foreground">Ir para o sistema</Link>
            <button onClick={() => signOut()} className="px-4 py-2 rounded border">Sair</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center lg:pt-0 pt-16">
      <div className="max-w-md w-full mx-4">
        <div className="bg-card rounded-lg shadow-medium p-6 border border-border">
          <h2 className="text-xl font-semibold text-center">Login com Supabase</h2>
          {status && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4 text-sm mt-3">
              {status}
            </div>
          )}
          <form onSubmit={onLogin} className="space-y-3 mt-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input type="email" className="w-full border px-3 py-2 rounded" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Senha</label>
              <input type="password" className="w-full border px-3 py-2 rounded" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground px-4 py-2 rounded">Entrar</button>
          </form>

          <div className="mt-6">
            <h3 className="text-sm font-medium">Ainda não tem conta?</h3>
            <form onSubmit={onSignup} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm mb-1">Nome completo</label>
                <input type="text" className="w-full border px-3 py-2 rounded" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <button type="submit" className="w-full border px-4 py-2 rounded">Cadastrar</button>
            </form>
          </div>

          <div className="mt-4">
            <button onClick={onReset} className="text-sm text-muted-foreground hover:text-foreground">Esqueci minha senha</button>
          </div>
        </div>
      </div>
    </div>
  );
}