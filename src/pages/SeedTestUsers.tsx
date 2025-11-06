import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SeedResult = {
  email: string;
  ok: boolean;
  message: string;
  userId?: string;
};

export default function SeedTestUsersPage() {
  const [results, setResults] = useState<SeedResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!supabase) return;
      setBusy(true);

      const testUsers = [
        { email: "master.teste@example.com", password: "Teste@123", full_name: "Usuário Master Teste", role: "admin" as const, is_master: true },
        { email: "admin.teste@example.com", password: "Teste@123", full_name: "Usuário Admin Teste", role: "admin" as const, is_master: false },
        { email: "comum.teste@example.com", password: "Teste@123", full_name: "Usuário Comum Teste", role: "user" as const, is_master: false },
      ];

      const { data: meAuth } = await supabase.auth.getUser();
      const me = meAuth.user;
      // Descobrir company_id do administrador atual via profiles
      let companyId: string | null = null;
      if (me?.id) {
        const { data: meProfile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", me.id)
          .maybeSingle();
        companyId = meProfile?.company_id ?? null;
      }

      const created: SeedResult[] = [];
      for (const tu of testUsers) {
        try {
          // Usa função Edge admin-create-user para garantir criação do Auth + perfil
          const resp = await supabase.functions.invoke("admin-create-user", {
            body: {
              email: tu.email,
              password: tu.password,
              full_name: tu.full_name,
              phone: null,
              role: tu.role,
              is_master: tu.is_master,
              company_id: companyId,
              unit_id: null,
            },
          });
          if (resp.error) {
            created.push({ email: tu.email, ok: false, message: resp.error.message });
            continue;
          }
          const userId = resp.data?.user_id ?? resp.data?.id ?? undefined;
          created.push({ email: tu.email, ok: true, message: "Criado", userId });
        } catch (err: any) {
          created.push({ email: tu.email, ok: false, message: err?.message ?? String(err) });
        }
      }

      setResults(created);
      setBusy(false);
      setDone(true);
    };
    run();
  }, []);

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-xl border rounded-md p-4">
        <h1 className="text-lg font-semibold mb-3">Seed: Usuários de Teste</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Criando três usuários de teste (master, admin e comum) via função segura.
        </p>
        {busy && <div className="text-sm text-muted-foreground">Processando...</div>}
        {done && (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.email} className="text-sm">
                <span className={r.ok ? "text-green-600" : "text-red-600"}>
                  {r.ok ? "OK" : "ERRO"}
                </span>{" "}- {r.email} — {r.message}{r.userId ? ` (user_id: ${r.userId})` : ""}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Acesse a página de Login e valide cada papel com as credenciais criadas.
        </div>
      </div>
    </div>
  );
}