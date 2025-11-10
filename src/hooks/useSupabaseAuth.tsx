import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type ProfileRow } from "../lib/supabase";

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

function deriveRole(user: User | null, profile: ProfileRow | null): SessionRole {
  if (profile) {
    if (profile.is_master) return "master";
    const normalized = normalizeRoleString((profile as any).role as string | null | undefined);
    if (normalized === "master") return "master";
    if (normalized === "admin") return "admin";
  }
  if (!user) return "user";
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  const appRole = (appMeta?.role as SessionRole | undefined) ?? undefined;
  const metaRole = (userMeta?.role as SessionRole | undefined) ?? undefined;
  if (appMeta?.is_master === true || userMeta?.is_master === true || appMeta?.is_super_admin === true) {
    return "master";
  }
  if (normalizeRoleString(appRole) === "master" || normalizeRoleString(metaRole) === "master") {
    return "master";
  }
  if (normalizeRoleString(appRole) === "admin" || normalizeRoleString(metaRole) === "admin") {
    return "admin";
  }
  return "user";
}

function deriveProfile(user: User | null, role: SessionRole): LightweightProfile | null {
  if (!user) return null;
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;
  const companyId = (user.user_metadata?.company_id as string | undefined) ?? null;
  return {
    user_id: user.id,
    full_name: fullName,
    role,
    is_master: role === "master",
    company_id: companyId,
    is_active: true,
  };
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
        if (mounted) {
          setProfileRow(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    const { data: sub } =
      supabase?.auth.onAuthStateChange((_event, session) => {
        setSessionUser(session?.user ?? null);
        setLoading(false);
        setProfileRow(null);
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
          const { data: vdata, error: verror } = await (supabase as any)
            .from("auth_users_view")
            .select("id,full_name,role,is_master,is_active,company_id")
            .eq("id", userId)
            .maybeSingle();
          if (verror) {
            console.warn("Falha ao carregar auth_users_view:", verror.message);
            setProfileRow(null);
            return;
          }
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

  const role = useMemo(() => deriveRole(sessionUser, profileRow), [sessionUser, profileRow]);

  const user: AuthUser | null = useMemo(() => {
    if (!sessionUser) return null;
    const fullName = (sessionUser.user_metadata?.full_name as string | undefined) ?? null;
    const companyId = (sessionUser.user_metadata?.company_id as string | undefined) ?? null;
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      role,
      fullName,
      companyId,
    };
  }, [sessionUser, role]);

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
    return deriveProfile(sessionUser, role);
  }, [profileRow, sessionUser, role]);

  const isMaster = useMemo(() => role === "master", [role]);
  const isAdmin = useMemo(() => role === "admin" || role === "master", [role]);

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, opts?: { full_name?: string; phone?: string; company_id?: string }) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: opts?.full_name ?? null,
          phone: opts?.phone ?? null,
          company_id: opts?.company_id ?? null,
        },
      },
    });
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
    const query = supabase.from("auth_users_view" as any).select("*").order("full_name", { ascending: true });
    const { data, error } = profile?.company_id
      ? await query.eq("company_id", profile.company_id)
      : await query;
    if (error) return { data: [], error };
    const mapped = (data ?? []).map((row: any) => ({
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
    const { data, error } = await (supabase as any)
      .from("auth_users_view")
      .select("*")
      .order("full_name", { ascending: true });
    if (error) return { data: [], error };
    const mapped = (data ?? []).map((row: any) => ({
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
    const { error } = await supabase.rpc("admin_update_user" as any, payload);
    return { error: error ?? null };
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