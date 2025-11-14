import React, { useEffect, useMemo, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type ListState = {
  loading: boolean;
  error: string | null;
};

export default function ProfilesManagementView() {
  const { listProfilesByCompany, updateProfile, profile: me, isMaster, sendPasswordReset } = useSupabaseAuth();
  const [profiles, setProfiles] = useState<Array<any>>([]);
  const [state, setState] = useState<ListState>({ loading: true, error: null });
  const [categories, setCategories] = useState<Array<any>>([]);
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});
  const [units, setUnits] = useState<Array<any>>([]);
  const [unitAssignments, setUnitAssignments] = useState<Record<string, string | null>>({});
  const [unitFilter, setUnitFilter] = useState<string>(() => {
    try {
      return localStorage.getItem("profiles_unit_filter") || "ALL";
    } catch {
      return "ALL";
    }
  });

  // Formulário de convite
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setInviteRole] = useState<"user">("user");
  const [inviteMaster, setInviteMaster] = useState<boolean>(false);
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  // Modal de edição
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [opMsg, setOpMsg] = useState<string>("");
  const [opBusy, setOpBusy] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ full_name: string; phone: string; unitId: string } | null>(null);

  async function refresh() {
    setState({ loading: true, error: null });
    const { data, error } = await listProfilesByCompany();
    if (error) {
      setState({ loading: false, error: error.message });
    } else {
      // Evita duplicações caso a view retorne múltiplas linhas por usuário
      const uniqueProfiles = Array.from(
        new Map((data || []).map((p: any) => [p.user_id, p])).values(),
      );
      setProfiles(uniqueProfiles);
      setState({ loading: false, error: null });
      // Carregar categorias, unidades e atribuições quando perfis forem obtidos
      await loadCategories();
      await loadUnits();
      await loadAssignments(uniqueProfiles);
      await loadUnitAssignments(uniqueProfiles);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir filtro em localStorage
  useEffect(() => {
    try {
      localStorage.setItem("profiles_unit_filter", unitFilter);
    } catch {}
  }, [unitFilter]);

  const myUserId = useMemo(() => me?.user_id ?? null, [me]);

  const displayedProfiles = useMemo(() => {
    if (unitFilter === "ALL") return profiles;
    if (unitFilter === "NONE") {
      return profiles.filter((p) => !unitAssignments[p.user_id]);
    }
    return profiles.filter((p) => unitAssignments[p.user_id] === unitFilter);
  }, [profiles, unitAssignments, unitFilter]);

  // Separar perfis em duas colunas: Administradores/Master (esquerda) e Usuários comuns (direita)
  const adminProfiles = useMemo(() => {
    return displayedProfiles.filter((p) => p.is_master);
  }, [displayedProfiles]);
  const userProfiles = useMemo(() => {
    return displayedProfiles.filter((p) => !p.is_master && p.role === "user");
  }, [displayedProfiles]);

  // Contadores por unidade
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) {
      const uid = unitAssignments[p.user_id] ?? null;
      if (!uid) {
        counts["NONE"] = (counts["NONE"] || 0) + 1;
      } else {
        counts[uid] = (counts[uid] || 0) + 1;
      }
    }
    counts["ALL"] = profiles.length;
    return counts;
  }, [profiles, unitAssignments]);

  async function loadCategories() {
    if (!supabase) return;
    const { data, error } = await supabase.from("access_categories").select("id,name,description").order("name");
    if (!error) {
      setCategories(data || []);
    }
  }

  async function loadUnits() {
    if (!supabase || !me?.company_id) return;
    const { data, error } = await supabase
      .from("business_units")
      .select("id,name")
      .eq("company_id", me.company_id)
      .order("name");
    if (!error) {
      setUnits(data || []);
    }
  }

  async function loadAssignments(currentProfiles: Array<any>) {
    if (!supabase || !currentProfiles?.length) return;
    const userIds = currentProfiles.map((p) => p.user_id);
    const { data, error } = await supabase
      .from("user_access_categories")
      .select("user_id, category_id")
      .in("user_id", userIds);
    if (!error) {
      const map: Record<string, string | null> = {};
      for (const row of data || []) {
        map[row.user_id] = row.category_id ?? null;
      }
      setAssignments(map);
    }
  }

  async function toggleActive(userId: string, current: boolean) {
    const { error } = await updateProfile(userId, { is_active: !current });
    if (!error) refresh();
  }

  // Removido: não há mais papel "admin"; todos são "user" e Master via is_master

  async function setMaster(userId: string, value: boolean) {
    const { error } = await updateProfile(userId, { is_master: value });
    if (!error) refresh();
  }

  // Ajustar tipo de acesso (user | master)
  async function setAccessType(userId: string, access: "user" | "master") {
    if (access === "master" && !isMaster) return;
    const payload: any = access === "master"
      ? { is_master: true, role: "user" }
      : { is_master: false, role: "user" };
    const { error } = await updateProfile(userId, payload);
    if (!error) refresh();
  }

  async function setUserCategory(userId: string, categoryId: string | null) {
    if (!supabase) return;
    if (!categoryId) {
      // Remover atribuição
      const { error } = await supabase.from("user_access_categories").delete().eq("user_id", userId);
      if (!error) {
        setAssignments((prev) => ({ ...prev, [userId]: null }));
      }
      return;
    }
    const { error } = await supabase
      .from("user_access_categories")
      .upsert({ user_id: userId, category_id: categoryId }, { onConflict: "user_id" });
    if (!error) {
      setAssignments((prev) => ({ ...prev, [userId]: categoryId }));
    }
  }

  async function loadUnitAssignments(currentProfiles: Array<any>) {
    if (!supabase || !currentProfiles?.length) return;
    const userIds = currentProfiles.map((p) => p.user_id);
    const { data, error } = await supabase
      .from("user_business_units")
      .select("user_id, unit_id")
      .in("user_id", userIds);
    if (!error) {
      const map: Record<string, string | null> = {};
      for (const row of data || []) {
        map[row.user_id] = row.unit_id ?? null;
      }
      setUnitAssignments(map);
    }
  }

  async function setUserUnit(userId: string, newUnitId: string | null) {
    if (!supabase) return;
    if (!newUnitId) {
      const { error } = await supabase.from("user_business_units").delete().eq("user_id", userId);
      if (!error) setUnitAssignments((prev) => ({ ...prev, [userId]: null }));
      return;
    }
    const { error } = await supabase
      .from("user_business_units")
      .upsert({ user_id: userId, unit_id: newUnitId }, { onConflict: "user_id" });
    if (!error) setUnitAssignments((prev) => ({ ...prev, [userId]: newUnitId }));
  }

  // Ações do modal
  function openEditModal(p: any) {
    setEditTarget(p);
    setOpMsg("");
    setResetEmail(p?.email ?? "");
    setEditOpen(true);
    const unitId = unitAssignments[p.user_id] ?? "";
    setEditForm({ full_name: p.full_name ?? "", phone: p.phone ?? "", unitId });
  }

  async function handleResetPassword() {
    if (!resetEmail.trim()) {
      setOpMsg("Informe o email do usuário para enviar reset.");
      return;
    }
    setOpBusy(true);
    const { error } = await sendPasswordReset(resetEmail.trim());
    setOpBusy(false);
    if (error) setOpMsg(`Erro ao enviar reset: ${error.message}`);
    else setOpMsg("Email de reset enviado.");
  }

  async function handleDeactivate() {
    if (!editTarget) return;
    setOpBusy(true);
    const { error } = await updateProfile(editTarget.user_id, { is_active: false });
    setOpBusy(false);
    if (error) setOpMsg(`Erro ao desativar: ${error.message}`);
    else {
      setOpMsg("Usuário desativado.");
      setEditTarget({ ...editTarget, is_active: false });
      refresh();
    }
  }

  async function handleActivate() {
    if (!editTarget) return;
    setOpBusy(true);
    const { error } = await updateProfile(editTarget.user_id, { is_active: true });
    setOpBusy(false);
    if (error) setOpMsg(`Erro ao ativar: ${error.message}`);
    else {
      setOpMsg("Usuário reativado.");
      setEditTarget({ ...editTarget, is_active: true });
      refresh();
    }
  }

  async function handleDeleteProfile() {
    if (!editTarget || !supabase) return;
    if (!window.confirm("Tem certeza que deseja excluir o perfil? Esta ação é irreversível.")) return;
    setOpBusy(true);
    try {
      const { error } = await supabase.rpc("admin_delete_user" as any, { p_user_id: editTarget.user_id });
      if (error) throw error;
      setOpMsg("Usuário excluído.");
      setEditOpen(false);
      setEditTarget(null);
      refresh();
    } catch (e: any) {
      setOpMsg(`Erro ao excluir: ${e?.message ?? "falha"}`);
    } finally {
      setOpBusy(false);
    }
  }

  async function handleSaveChanges() {
    if (!editTarget || !editForm) return;
    setOpBusy(true);
    // Atualiza perfil
    const { error } = await updateProfile(editTarget.user_id, {
      full_name: editForm.full_name,
      phone: editForm.phone,
      role: editForm.role,
    });
    // Atualiza unidade
    await setUserUnit(editTarget.user_id, editForm.unitId || null);
    setOpBusy(false);
    if (error) setOpMsg(`Erro ao salvar: ${error.message}`);
    else {
      setOpMsg("Alterações salvas.");
      refresh();
    }
  }

  // Atualizar presença (apenas o próprio Master)
  async function setPresenceStatus(userId: string, status: "online" | "offline" | "away") {
    if (!supabase) return;
    // Segurança básica de UI: só permite alterar o próprio status se Master
    if (!(me?.user_id === userId && me?.is_master)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ presence_status: status, last_seen_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!error) {
      // Sincronizar em memória para refletir imediatamente
      setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, presence_status: status, last_seen_at: new Date().toISOString() } : p)));
    }
  }

  function presenceDotClass(status: string | null | undefined) {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-400";
      case "offline":
      default:
        return "bg-gray-400";
    }
  }

  function formatLastSeen(s?: string | null): string {
    if (!s) return "Nunca";
    const d = new Date(s);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    if (!password.trim()) {
      setInviteMsg("Informe uma senha para criação");
      setInviting(false);
      return;
    }

    setInviting(true);
    const resp = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: email.trim(),
        password: password.trim(),
        full_name: fullName || null,
        phone: phone || null,
        role: "user",
        is_master: isMaster ? inviteMaster : false,
      },
    });
    setInviting(false);

    if (resp.error) {
      setInviteMsg(`Erro: ${resp.error.message}`);
    } else {
      const newUserId = (resp.data as any)?.user_id ?? (resp.data as any)?.id ?? null;
      if (newUserId) {
        if (unitId) {
          await setUserUnit(newUserId, unitId || null);
        }
        if (assignments[newUserId] !== undefined) {
          await setUserCategory(newUserId, assignments[newUserId]);
        }
      }
      setInviteMsg("Usuário criado no Supabase.");
      setEmail("");
      setFullName("");
      setPhone("");
      setRole("user");
      setInviteMaster(false);
      setPassword("");
      setUnitId("");
      setCreateOpen(false);
      refresh();
    }
  }

  function openCreateModal() {
    setEmail("");
    setFullName("");
    setPhone("");
    setRole("user");
    setInviteMaster(false);
    setPassword("");
    setUnitId("");
    setInviteMsg(null);
    setCreateOpen(true);
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Usuários</h2>
          <p className="text-sm text-muted-foreground">
            Administre os perfis da empresa: ativação e acesso Master.
          </p>
        </div>
        {isMaster && (
          <Button onClick={openCreateModal}>Novo usuário</Button>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setInviteMsg(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Informe os dados para criar um novo acesso no Supabase.</DialogDescription>
          </DialogHeader>
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
              <label className="block text-xs text-muted-foreground mb-1">Senha inicial</label>
              <input
                className="w-full border rounded px-2 py-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Defina a senha inicial"
              />
            </div>
            {/* Sem cargo: somente Usuário; acesso Master via checkbox abaixo */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Unidade de negócio</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                <option value="">Sem unidade</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
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
                <label htmlFor="inviteMaster" className="text-sm">Conceder acesso Master</label>
              </div>
            )}
          </div>
          {inviteMsg && <p className="text-sm text-muted-foreground mt-2">{inviteMsg}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={inviting}>Cancelar</Button>
            <Button onClick={inviteUser} disabled={inviting}>
              {inviting ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {state.loading && (
        <div className="text-muted-foreground">Carregando perfis...</div>
      )}
      {state.error && (
        <div className="text-red-600">Erro: {state.error}</div>
      )}

      {!state.loading && !state.error && (
        <div className="border rounded-md">
          {/* Filtro por unidade */}
          <div className="p-3 flex items-center gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Filtrar por unidade</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
              >
                <option value="ALL">Todas ({unitCounts["ALL"] || 0})</option>
                <option value="NONE">Sem unidade ({unitCounts["NONE"] || 0})</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({unitCounts[u.id] || 0})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duas colunas: Masters (esquerda) e Usuários (direita) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
            {/* Coluna de Masters */}
            <div className="border rounded-md overflow-x-auto">
              <div className="px-3 py-2 border-b">
                <h3 className="font-semibold">Masters</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">Tipo de acesso</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {adminProfiles.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={3}>Nenhum Master encontrado</td>
                    </tr>
                  ) : (
                    adminProfiles.map((p) => (
                      <tr key={p.user_id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {/* Sem avatar armazenado; usa iniciais */}
                              <AvatarFallback>{(p.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{p.full_name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={p.is_master ? "master" : "user"}
                            onChange={(e) => setAccessType(p.user_id, e.target.value as any)}
                          >
                            <option value="user">Usuário</option>
                            {isMaster && <option value="master">Master</option>}
                          </select>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button
                            className="px-2 py-1 border rounded hover:bg-accent"
                            onClick={() => openEditModal(p)}
                            title="Editar"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Coluna de Usuários */}
            <div className="border rounded-md overflow-x-auto">
              <div className="px-3 py-2 border-b">
                <h3 className="font-semibold">Usuários</h3>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Nome</th>
                    <th className="text-left px-3 py-2">Unidade</th>
                    <th className="text-left px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {userProfiles.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={3}>Nenhum usuário encontrado</td>
                    </tr>
                  ) : (
                    userProfiles.map((p) => (
                      <tr key={p.user_id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{(p.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{p.full_name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={unitAssignments[p.user_id] ?? ""}
                            onChange={(e) => setUserUnit(p.user_id, e.target.value || null)}
                          >
                            <option value="">Sem unidade</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          <button
                            className="px-2 py-1 border rounded hover:bg-accent"
                            onClick={() => openEditModal(p)}
                            title="Editar"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        Observação: criação de usuários requer fluxo de convite ou serviço.
      </div>

      {/* Modal de edição de usuário */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-blue-900 text-white rounded-2xl border border-blue-700 shadow-lg">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription className="text-blue-100">Gerencie ações rápidas para o perfil selecionado.</DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{(editTarget.full_name ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0,2)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-semibold">{editForm?.full_name || "—"}</div>
                  <div className="text-xs opacity-80">ID: <span className="font-mono">{editTarget.user_id}</span></div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1 opacity-90">Nome completo</label>
                  <input className="w-full rounded px-3 py-2 bg-blue-800 text-white border border-blue-600 placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400" value={editForm?.full_name || ""} onChange={(e) => setEditForm((f) => f ? { ...f, full_name: e.target.value } : f)} />
                </div>
                <div>
                  <label className="block text-xs mb-1 opacity-90">Telefone</label>
                  <input className="w-full rounded px-3 py-2 bg-blue-800 text-white border border-blue-600 placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400" value={editForm?.phone || ""} onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)} />
                </div>
                <div>
                  <label className="block text-xs mb-1 opacity-90">Email para reset de senha</label>
                  <input className="w-full rounded px-3 py-2 bg-blue-800 text-white border border-blue-600 placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="email@empresa.com" />
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={handleResetPassword} disabled={opBusy} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-70 disabled:cursor-not-allowed">Enviar reset</Button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1 opacity-90">Unidade</label>
                  <select className="w-full rounded px-3 py-2 bg-blue-800 text-white border border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400" value={editForm?.unitId || ""} onChange={(e) => setEditForm((f) => f ? { ...f, unitId: e.target.value } : f)}>
                    <option value="">Sem unidade</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {/* Tipo de acesso agora é somente Usuário; Master é controlado via coluna principal */}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" onClick={handleDeactivate} disabled={opBusy || !editTarget.is_active} className="bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-70 disabled:cursor-not-allowed">Desativar conta</Button>
                <Button size="sm" onClick={handleActivate} disabled={opBusy || editTarget.is_active} className="bg-green-600 hover:bg-green-500 text-white disabled:opacity-70 disabled:cursor-not-allowed">Reativar conta</Button>
                {isMaster && (
                  <Button size="sm" onClick={handleDeleteProfile} disabled={opBusy} className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-70 disabled:cursor-not-allowed">Excluir conta</Button>
                )}
                <Button size="sm" onClick={handleSaveChanges} disabled={opBusy} className="bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-70 disabled:cursor-not-allowed">Salvar alterações</Button>
              </div>

              {opMsg && <div className="text-xs opacity-80">{opMsg}</div>}
          </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nenhum usuário selecionado</div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditOpen(false)} className="bg-slate-200 text-blue-900 hover:bg-slate-300">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
