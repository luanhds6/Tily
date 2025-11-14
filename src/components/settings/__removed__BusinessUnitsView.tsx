import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type Unit = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
};

export default function BusinessUnitsView() {
  const { profile, isAdmin } = useSupabaseAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setMsg(null);
    if (!supabase || !profile?.company_id) return;
    const { data, error } = await supabase
      .from("business_units")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true });
    if (error) setMsg(error.message);
    setUnits(data || []);
  }

  useEffect(() => { refresh(); }, [profile?.company_id]);

  async function createUnit() {
    setMsg(null);
    if (!supabase || !profile?.company_id) return;
    if (!name.trim()) { setMsg("Informe o nome da unidade"); return; }
    setBusy(true);
    const { error } = await supabase
      .from("business_units")
      .insert({ company_id: profile.company_id, name: name.trim(), code: code || null, is_active: true });
    setBusy(false);
    if (error) setMsg(error.message);
    setName(""); setCode("");
    refresh();
  }

  async function toggleActive(unit: Unit) {
    if (!supabase) return;
    const { error } = await supabase
      .from("business_units")
      .update({ is_active: !unit.is_active })
      .eq("id", unit.id);
    if (error) setMsg(error.message);
    refresh();
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Unidades de Negócio</h2>
        <p className="text-sm text-muted-foreground">Crie e gerencie unidades para organizar usuários.</p>
      </div>

      {isAdmin ? (
        <div className="mb-6 border rounded-md p-3">
          <div className="font-medium mb-2">Cadastrar nova unidade</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nome</label>
              <input className="w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Código (opcional)</label>
              <input className="w-full border rounded px-2 py-1" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="px-3 py-1 border rounded hover:bg-accent" onClick={createUnit} disabled={busy}>
              {busy ? "Salvando..." : "Salvar unidade"}
            </button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </div>
      ) : (
        <div className="mb-3 text-sm text-muted-foreground">Apenas administradores podem cadastrar unidades.</div>
      )}

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Código</th>
              <th className="text-left px-3 py-2">Ativa</th>
              <th className="text-left px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.code || "—"}</td>
                <td className="px-3 py-2">{u.is_active ? "Sim" : "Não"}</td>
                <td className="px-3 py-2">
                  <button className="px-2 py-1 border rounded hover:bg-accent" onClick={() => toggleActive(u)}>
                    {u.is_active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-2 text-muted-foreground">Nenhuma unidade cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}