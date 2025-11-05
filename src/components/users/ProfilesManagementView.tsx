import React, { useEffect, useMemo, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

type ListState = {
  loading: boolean;
  error: string | null;
};

export default function ProfilesManagementView() {
  const { listProfilesByCompany, updateProfile, profile: me, isMaster } = useSupabaseAuth();
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [state, setState] = useState<ListState>({ loading: true, error: null });

  // Formulário de convite
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setInviteRole] = useState<"user" | "admin">("user");
  const [inviteMaster, setInviteMaster] = useState<boolean>(false);
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  async function refresh() {
    setState({ loading: true, error: null });
    const { data, error } = await listProfilesByCompany();
    if (error) {
      setState({ loading: false, error: error.message });
    } else {
      setProfiles(data);
      setState({ loading: false, error: null });
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myUserId = useMemo(() => me?.user_id ?? null, [me]);

  async function toggleActive(userId: string, current: boolean) {
    const { error } = await updateProfile(userId, { is_active: !current });
    if (!error) refresh();
  }

  async function setRole(userId: string, role: "user" | "admin") {
    const { error } = await updateProfile(userId, { role });
    if (!error) refresh();
  }

  async function setMaster(userId: string, value: boolean) {
    const { error } = await updateProfile(userId, { is_master: value });
    if (!error) refresh();
  }

  async function inviteUser() {
    setInviteMsg(null);
    if (!supabase) {
      setInviteMsg("Supabase não configurado");
      return;
    }
    if (!email.trim()) {
      setInviteMsg("Informe um email válido");
      return;
    }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: email.trim(),
        full_name: fullName || null,
        phone: phone || null,
        role,
        is_master: isMaster ? inviteMaster : false,
        company_id: me?.company_id,
        redirectTo: window.location.origin + "/login",
      },
    });
    setInviting(false);
    if (error) {
      setInviteMsg(`Erro: ${error.message}`);
    } else {
      setInviteMsg("Convite enviado e perfil criado.");
      setEmail("");
      setFullName("");
      setPhone("");
      setRole("user");
      setInviteMaster(false);
      refresh();
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Gestão de Perfis (Supabase)</h2>
        <p className="text-sm text-muted-foreground">
          Administre os perfis da empresa: ativação, cargos e master.
        </p>
      </div>

      {/* Formulário de convite */}
      <div className="mb-6 border rounded-md p-3">
        <div className="font-medium mb-2">Convidar novo usuário</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nome completo</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do usuário"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Telefone</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Cargo</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={role}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {isMaster && (
            <div className="flex items-center gap-2">
              <input
                id="inviteMaster"
                type="checkbox"
                checked={inviteMaster}
                onChange={(e) => setInviteMaster(e.target.checked)}
              />
              <label htmlFor="inviteMaster" className="text-sm">Convidar como Master</label>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded hover:bg-accent"
            onClick={inviteUser}
            disabled={inviting}
          >
            {inviting ? "Enviando convite..." : "Enviar convite"}
          </button>
          {inviteMsg && <span className="text-sm text-muted-foreground">{inviteMsg}</span>}
        </div>
      </div>

      {state.loading && (
        <div className="text-muted-foreground">Carregando perfis...</div>
      )}
      {state.error && (
        <div className="text-red-600">Erro: {state.error}</div>
      )}

      {!state.loading && !state.error && (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2">Nome</th>
                <th className="text-left px-3 py-2">Telefone</th>
                <th className="text-left px-3 py-2">User ID</th>
                <th className="text-left px-3 py-2">Ativo</th>
                <th className="text-left px-3 py-2">Cargo</th>
                <th className="text-left px-3 py-2">Master</th>
                <th className="text-left px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.user_id} className="border-t">
                  <td className="px-3 py-2">{p.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{p.phone ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.user_id}</td>
                  <td className="px-3 py-2">
                    <span className={p.is_active ? "text-green-600" : "text-muted-foreground"}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{p.is_master ? "master" : p.role}</td>
                  <td className="px-3 py-2">{p.is_master ? "Sim" : "Não"}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      className="px-2 py-1 border rounded hover:bg-accent"
                      onClick={() => toggleActive(p.user_id, p.is_active)}
                      disabled={myUserId === p.user_id}
                      title={myUserId === p.user_id ? "Não pode alterar seu próprio status" : "Alternar ativo"}
                    >
                      {p.is_active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="px-2 py-1 border rounded hover:bg-accent"
                      onClick={() => setRole(p.user_id, p.role === "admin" ? "user" : "admin")}
                      disabled={p.is_master}
                      title={p.is_master ? "Master sempre tem poderes de admin" : "Alternar cargo admin"}
                    >
                      {p.role === "admin" ? "Tornar usuário" : "Tornar admin"}
                    </button>
                    {isMaster && (
                      <button
                        className="px-2 py-1 border rounded hover:bg-accent"
                        onClick={() => setMaster(p.user_id, !p.is_master)}
                        disabled={myUserId === p.user_id}
                        title={myUserId === p.user_id ? "Não pode alterar seu próprio master" : "Alternar master"}
                      >
                        {p.is_master ? "Remover master" : "Tornar master"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        Observação: criação de usuários requer fluxo de convite ou serviço.
      </div>
    </div>
  );
}