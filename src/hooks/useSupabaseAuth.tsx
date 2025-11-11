import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type ProfileRow, ensureProfileForUser } from "../lib/supabase";

type SessionRole = "user" | "admin" | "master";

type AuthUser = {
  id: string;
  email: string | null;
  role: SessionRole;
  fullName: string | null;
  companyId: string | null;
};

type LightweightProfile = {
  user_id: string;
  full_name: string | null;
  role: SessionRole;
  is_master: boolean;
  company_id: string | null;
  is_active: boolean;
};

// Normaliza strings de papéis vindos do banco para "user" | "admin" | "master"
function normalizeRoleString(raw: string | null | undefined): SessionRole {
  const v = (raw || "").toString().trim().toLowerCase();
  if (!v) return "user";
  // Mapeamentos comuns
  if (["master", "master_admin", "super_admin", "owner", "root", "superuser"].includes(v)) return "master";
  if (["admin", "administrator", "manager", "moderator"].includes(v)) return "admin";
  return "user";
}

function deriveRole(_user: User | null, profile: ProfileRow | null): SessionRole {
  // Não usamos mais metadados do Auth; apenas dados do Supabase (profiles)
  if (profile) {
    if (profile.is_master) return "master";
    const normalized = normalizeRoleString((profile as any).role as string | null | undefined);
    if (normalized === "master") return "master";
    if (normalized === "admin") return "admin";
  }
  return "user";
}

function deriveProfile(_user: User | null, _role: SessionRole): LightweightProfile | null {
  // Não derivamos mais perfil a partir de metadados do Auth
  return null;
}

export function useSupabaseAuth() {
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        if (!supabase) {
          if (mounted) setLoading(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const nextUser = data.session?.user ?? null;
        setSessionUser(nextUser);
        // Garante que exista uma linha na tabela profiles para o usuário atual
        if (nextUser) {
          try {
            await ensureProfileForUser({ id: nextUser.id, email: nextUser.email });
            await loadProfile(nextUser.id);
          } catch (e) {
            // Não interrompe bootstrap em caso de erro; apenas loga
            console.warn("Falha ao garantir perfil do usuário:", (e as any)?.message || e);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    const { data: sub } =
      supabase?.auth.onAuthStateChange(async (_event, session) => {
        const nextUser = session?.user ?? null;
        setSessionUser(nextUser);
        setLoading(false);
        if (nextUser) {
          try {
            await ensureProfileForUser({ id: nextUser.id, email: nextUser.email });
            await loadProfile(nextUser.id);
          } catch (e) {
            console.warn("Falha ao garantir perfil do usuário (auth change):", (e as any)?.message || e);
          }
        } else {
          setProfileRow(null);
        }
      }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      mounted = false;
      // @ts-ignore
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("Falha ao carregar perfil do Supabase:", error.message);
        // Fallback: tentar carregar da view de usuários se RLS impedir SELECT no profiles
        try {
          const { data: vdataRaw, error: verror } = await supabase.rpc(
            "get_auth_user" as any,
            { p_user_id: userId }
          );
          if (verror) {
            console.warn("Falha ao carregar auth_users_view:", verror.message);
            setProfileRow(null);
            return;
          }
          const vdata = Array.isArray(vdataRaw) ? vdataRaw[0] : vdataRaw;
          if (vdata) {
            const normalizedRole = normalizeRoleString(vdata.role);
            const pseudoProfile = {
              user_id: vdata.id,
              full_name: (vdata.full_name as string | null) ?? null,
              role: normalizedRole,
              is_master: vdata.is_master === true || normalizedRole === "master",
              is_active: vdata.is_active !== false,
              company_id: vdata.company_id ?? null,
              // Campos opcionais preenchidos com defaults para compatibilidade
              avatar_url: null,
              phone: null,
              presence_status: "online",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            } as unknown as ProfileRow;
            setProfileRow(pseudoProfile);
            return;
          }
          setProfileRow(null);
          return;
        } catch (fallbackErr) {
          console.error("Erro inesperado no fallback de perfil:", fallbackErr);
          setProfileRow(null);
          return;
        }
      }
      setProfileRow(data ?? null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionUser) {
      setProfileRow(null);
      return;
    }
    loadProfile(sessionUser.id).catch((err) => {
      console.error("Erro inesperado ao carregar perfil:", err);
    });
  }, [sessionUser, loadProfile]);

  // Mantém o perfil sincronizado em tempo real: quando a linha do perfil
  // deste usuário é atualizada/inserida, recarrega os dados localmente.
  useEffect(() => {
    if (!supabase || !sessionUser?.id) return;
    let channel: any = null;
    try {
      channel = supabase
        .channel(`profiles_self_${sessionUser.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${sessionUser.id}` },
          () => {
            loadProfile(sessionUser.id).catch((err) => console.warn('Falha ao sincronizar perfil (UPDATE):', err));
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles', filter: `user_id=eq.${sessionUser.id}` },
          () => {
            loadProfile(sessionUser.id).catch((err) => console.warn('Falha ao sincronizar perfil (INSERT):', err));
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Falha ao assinar atualizações de perfil:', (e as any)?.message || e);
    }
    return () => {
      try {
        if (channel && supabase) supabase.removeChannel(channel);
      } catch {}
    };
  }, [sessionUser?.id, loadProfile]);

  const role = useMemo(() => deriveRole(sessionUser, profileRow), [sessionUser, profileRow]);

  const user: AuthUser | null = useMemo(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      role,
      fullName: profileRow?.full_name ?? null,
      companyId: profileRow?.company_id ?? null,
    };
  }, [sessionUser, role, profileRow]);

  const profile = useMemo(() => {
    if (profileRow) {
      return {
        user_id: profileRow.user_id,
        full_name: profileRow.full_name,
        role: (profileRow.role as SessionRole) ?? "user",
        is_master: profileRow.is_master ?? false,
        company_id: profileRow.company_id,
        is_active: profileRow.is_active ?? true,
      };
    }
    return null;
  }, [profileRow]);

  const isMaster = useMemo(() => role === "master", [role]);
  const isAdmin = useMemo(() => role === "admin" || role === "master", [role]);

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, _opts?: { full_name?: string; phone?: string; company_id?: string }) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    // Não utilizamos mais metadados do Auth; criação de perfil deve ser feita via tabela 'profiles'
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    return { data, error: null };
  }

  async function signOut() {
    if (!supabase) {
      // Limpa estado local mesmo sem cliente Supabase
      setSessionUser(null);
      setLoading(false);
      setProfileRow(null);
      return { error: new Error("Supabase não configurado") };
    }
    const { error } = await supabase.auth.signOut();
    // Proativamente limpa estado local e encerra loading
    setSessionUser(null);
    setLoading(false);
    setProfileRow(null);
    // Opcional: força avaliação da sessão após signOut
    try {
      await supabase.auth.getSession();
    } catch {}
    return { error };
  }

  async function sendPasswordReset(email: string) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    return { error };
  }

  async function listProfilesByCompany() {
    if (!supabase) return { data: [], error: new Error("Supabase não configurado") };
    // Primeiro tenta pelas RPCs
    const rpcRes = profile?.company_id
      ? await supabase.rpc("get_auth_users_by_company" as any, { p_company_id: profile.company_id })
      : await supabase.rpc("get_auth_users" as any, {});
    let rows = (rpcRes.data ?? []) as Array<any>;
    if (rpcRes.error) {
      const msg = rpcRes.error.message || "";
      const isNotFound = (rpcRes as any).status === 404 || /schema cache/i.test(msg) || /PGRST202/i.test((rpcRes.error as any).code || "");
      if (!isNotFound) return { data: [], error: rpcRes.error };
      // Fallback 1: tentar a view
      const { data: vdata, error: verror } = await supabase
        .from("auth_users_view")
        .select("id,email,full_name,role,is_master,is_active,company_id,phone,last_sign_in_at,created_at,updated_at")
        .match(profile?.company_id ? { company_id: profile.company_id } : {});
      if (!verror && vdata) {
        rows = vdata as any[];
      } else {
        // Fallback 2: apenas profiles
        const { data: pdata, error: perror } = await supabase
          .from("profiles")
          .select("user_id,full_name,role,is_master,is_active,company_id,phone,created_at,updated_at")
          .match(profile?.company_id ? { company_id: profile.company_id } : {});
        if (perror) return { data: [], error: rpcRes.error };
        rows = (pdata ?? []).map((p: any) => ({
          id: p.user_id,
          email: null,
          full_name: p.full_name,
          role: p.role,
          is_master: p.is_master,
          is_active: p.is_active,
          company_id: p.company_id,
          phone: p.phone,
          last_sign_in_at: null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }
    }

    const sorted = rows.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    const mapped = sorted.map((row: any) => ({
      user_id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: normalizeRoleString(row.role ?? "user"),
      is_master: (row.is_master ?? false) || normalizeRoleString(row.role) === "master",
      is_active: row.is_active ?? true,
      phone: row.phone ?? null,
      last_sign_in_at: row.last_sign_in_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      company_id: row.company_id,
    }));
    return { data: mapped, error: null };
  }

  // Lista todos os usuários do sistema (sem filtro por empresa)
  async function listAllUsers() {
    if (!supabase) return { data: [], error: new Error("Supabase não configurado") };
    // Tenta RPC e aplica fallbacks
    const rpcRes = await supabase.rpc("get_auth_users" as any, {});
    let rows = (rpcRes.data ?? []) as Array<any>;
    if (rpcRes.error) {
      const msg = rpcRes.error.message || "";
      const isNotFound = (rpcRes as any).status === 404 || /schema cache/i.test(msg) || /PGRST202/i.test((rpcRes.error as any).code || "");
      if (!isNotFound) return { data: [], error: rpcRes.error };
      // Fallback 1: view
      const { data: vdata, error: verror } = await supabase
        .from("auth_users_view")
        .select("id,email,full_name,role,is_master,is_active,company_id,phone,last_sign_in_at,created_at,updated_at");
      if (!verror && vdata) {
        rows = vdata as any[];
      } else {
        // Fallback 2: profiles
        const { data: pdata, error: perror } = await supabase
          .from("profiles")
          .select("user_id,full_name,role,is_master,is_active,company_id,phone,created_at,updated_at");
        if (perror) return { data: [], error: rpcRes.error };
        rows = (pdata ?? []).map((p: any) => ({
          id: p.user_id,
          email: null,
          full_name: p.full_name,
          role: p.role,
          is_master: p.is_master,
          is_active: p.is_active,
          company_id: p.company_id,
          phone: p.phone,
          last_sign_in_at: null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }
    }
    const sorted = rows.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
    const mapped = sorted.map((row: any) => ({
      user_id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: normalizeRoleString(row.role ?? "user"),
      is_master: (row.is_master ?? false) || normalizeRoleString(row.role) === "master",
      is_active: row.is_active ?? true,
      phone: row.phone ?? null,
      last_sign_in_at: row.last_sign_in_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      company_id: row.company_id,
    }));
    return { data: mapped, error: null };
  }

  async function updateProfile(userId: string, updates: Record<string, unknown>) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const payload = {
      p_user_id: userId,
      p_full_name: (updates.full_name as string | undefined) ?? null,
      p_role: (updates.role as string | undefined) ?? null,
      p_is_master: updates.is_master as boolean | null | undefined,
      p_is_active: updates.is_active as boolean | null | undefined,
    };
    const rpc = await supabase.rpc("admin_update_user" as any, payload);
    if (!rpc.error) return { error: null };
    // Fallback: se a função não estiver disponível no schema cache (404/PGRST202), tenta update direto na tabela
    const msg = rpc.error.message || "";
    const isNotFound = (rpc as any).status === 404 || /schema cache/i.test(msg) || /PGRST202/i.test((rpc.error as any).code || "");
    if (isNotFound) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          full_name: (updates.full_name as string | undefined) ?? undefined,
          role: (updates.role as string | undefined) ?? undefined,
          is_master: (updates.is_master as boolean | null | undefined) ?? undefined,
          is_active: (updates.is_active as boolean | null | undefined) ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      return { error: upErr ?? null };
    }
    return { error: rpc.error ?? null };
  }

  // Força recarregar o usuário da sessão (após updateUser de metadados)
  async function refreshAuthUser() {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      setSessionUser(data.session?.user ?? null);
    }
    return { error };
  }

  // Força recarregar o profile.row a partir do user_id atual
  async function reloadProfile() {
    if (!sessionUser || !supabase) return { error: new Error("Supabase não configurado") };
    await loadProfile(sessionUser.id);
    return { error: null };
  }

  return {
    user,
    profile,
    loading: loading || profileLoading,
    isMaster,
    isAdmin,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    listProfilesByCompany,
    listAllUsers,
    updateProfile,
    refreshAuthUser,
    reloadProfile,
  };
}