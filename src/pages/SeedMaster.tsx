import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function SeedMasterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("luanhenriquesm7@gmail.com");
  const [password, setPassword] = useState("=1m3QR8;");
  const [fullName, setFullName] = useState("Luan TI");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [lastDetails, setLastDetails] = useState<any>(null);

  useEffect(() => {
    const checkMaster = async () => {
      if (!supabase) {
        setChecking(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("is_master")
        .eq("is_master", true)
        .limit(1);
      setChecking(false);
      if (!error && data && data.length > 0) {
        setMsg("Já existe um master cadastrado. Redirecionando...");
        setTimeout(() => navigate("/"), 1200);
      }
    };
    checkMaster();
  }, [navigate]);

  async function seed() {
    setMsg(null);
    if (!supabase) {
      setMsg("Supabase não configurado");
      return;
    }
    setBusy(true);
    // 1) Cria usuário via signUp (sem precisar de service role)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setBusy(false);
      setMsg(`Erro ao criar usuário: ${signUpError.message}`);
      setLastDetails({ step: "signUp", error: signUpError.message });
      return;
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      // Em projetos com confirmação de email, a sessão pode não ser criada
      // mas o userId normalmente é retornado. Se não vier, avise para confirmar email.
      setBusy(false);
      setMsg("Usuário criado, mas userId não retornou. Confirme o email ou tente novamente.");
      setLastDetails({ step: "signUp", note: "missing userId", signUpData });
      return;
    }

    // 2) Promove a master via RPC segura (SECURITY DEFINER), apenas se não existir master
    const { data: rpcData, error: rpcError } = await supabase.rpc("bootstrap_master_if_none", {
      p_user_id: userId,
      p_email: email,
      p_full_name: fullName || null,
      p_phone: phone || null,
    });
    setBusy(false);
    if (rpcError) {
      setMsg(`Erro ao promover master: ${rpcError.message}`);
      setLastDetails({ step: "rpc", error: rpcError.message });
      return;
    }
    if (rpcData?.ok) {
      setMsg("Usuário master criado. Faça login na página de Login.");
      setLastDetails({ step: "rpc", ok: true, rpcData });
    } else if (rpcData?.error === "master_already_exists") {
      setMsg("Já existe um master cadastrado. Faça login com a conta master existente.");
      setLastDetails({ step: "rpc", error: "master_already_exists", rpcData });
    } else {
      setMsg("Ação concluída com resultado desconhecido.");
      setLastDetails({ step: "rpc", rpcData });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-md p-4">
        <h1 className="text-xl font-semibold mb-3">Seed: Criar usuário master</h1>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nome</label>
            <input className="w-full border rounded px-2 py-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input className="w-full border rounded px-2 py-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Senha</label>
            <input className="w-full border rounded px-2 py-1" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefone</label>
            <input className="w-full border rounded px-2 py-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="px-3 py-1 border rounded hover:bg-accent" onClick={seed} disabled={busy || checking}>
            {busy ? "Criando..." : "Criar master"}
          </button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          {checking && <span className="text-xs text-muted-foreground">Verificando master existente...</span>}
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Após criar, acesse a página de <a href="/login" className="underline">Login</a> e entre com as credenciais.
        </div>

        <div className="mt-4">
          <button className="text-xs underline" onClick={() => setDetailsOpen((v) => !v)}>
            {detailsOpen ? "Ocultar detalhes" : "Mostrar detalhes"}
          </button>
          {detailsOpen && (
            <pre className="mt-2 text-xs bg-muted/30 p-2 rounded overflow-auto max-h-48">
              {JSON.stringify(lastDetails, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}