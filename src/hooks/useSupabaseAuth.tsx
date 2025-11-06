import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentProfile, ensureProfileForUser, type ProfileRow } from "../lib/supabase";

type AuthUser = {
  id: string;
  email: string | null;
};

export function useSupabaseAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // Failsafe para evitar loading infinito em caso de rede lenta/erro
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    async function bootstrap() {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        const authUser = data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null;
        if (!mounted) return;
        setUser(authUser);
        if (authUser) {
          try {
            let { data: p } = await getCurrentProfile();
            if (!p) {
              await ensureProfileForUser({ id: authUser.id, email: authUser.email });
              const { data: after } = await getCurrentProfile();
              p = after ?? null;
            }
            if (!mounted) return;
            setProfile(p);
          } catch (_) {
            if (!mounted) return;
            setProfile(null);
          }
        }
      } catch (_) {
        // ignora e encerra loading
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(timeout);
      }
    }

    bootstrap();

    const { data: sub } = supabase?.auth.onAuthStateChange(async (_event, session) => {
      try {
        const nextUser = session?.user ? { id: session.user.id, email: session.user.email } : null;
        setUser(nextUser);
        if (nextUser) {
          try {
            let { data: p } = await getCurrentProfile();
            if (!p) {
              await ensureProfileForUser({ id: nextUser.id, email: nextUser.email });
              const { data: after } = await getCurrentProfile();
              p = after ?? null;
            }
            setProfile(p);
          } catch (_) {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      mounted = false;
      clearTimeout(timeout);
      // @ts-ignore
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  // Heartbeat de presença: atualiza status automaticamente enquanto logado
  useEffect(() => {
    if (!supabase || !profile?.user_id) return;
    let cancelled = false;

    async function setOnline() {
      try {
        const update: any = { last_seen_at: new Date().toISOString() };
        // Usuários comuns: garantimos 'online'; Admin/Master: não sobrescrever status manual (apenas heartbeat)
        if (!(profile?.is_master || profile?.role === "admin")) {
          update.presence_status = "online";
        }
        await supabase.from("profiles").update(update).eq("user_id", profile.user_id);
      } catch {}
    }

    // atualiza imediatamente e a cada 60s
    setOnline();
    const timer = setInterval(setOnline, 60000);

    const onUnload = async () => {
      try {
        await supabase
          .from("profiles")
          .update({ presence_status: "offline", last_seen_at: new Date().toISOString() })
          .eq("user_id", profile.user_id);
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      if (cancelled) return;
      clearInterval(timer);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [profile?.user_id, profile?.role, profile?.is_master]);

  const isMaster = useMemo(() => profile?.is_master === true, [profile]);
  const isAdmin = useMemo(() => profile?.role === "admin" || profile?.is_master === true, [profile]);

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, opts?: { full_name?: string; phone?: string; company_id?: string }) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    // Após confirmação de email/login, crie o perfil do próprio usuário
    const authed = await supabase.auth.getUser();
    if (authed.data.user) {
      const companyId = opts?.company_id;
      if (!companyId) {
        // fallback: tenta resolver empresa atual via helper de company
        try {
          const { getCurrentCompany } = await import("../lib/supabase");
          const { data: company } = await getCurrentCompany();
          if (company?.id) {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                user_id: authed.data.user.id,
                company_id: company.id,
                role: "user",
                is_active: true,
                is_master: false,
                full_name: opts?.full_name ?? null,
                phone: opts?.phone ?? null,
              });
            if (insertError) {
              // ignore silently; admin poderá ajustar depois
            }
          }
        } catch (_) {}
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: authed.data.user.id,
            company_id: companyId,
            role: "user",
            is_active: true,
            is_master: false,
            full_name: opts?.full_name ?? null,
            phone: opts?.phone ?? null,
          });
        if (insertError) {
          // ignore silently; admin poderá ajustar depois
        }
      }
    }

    return { data, error: null };
  }

  async function signOut() {
    if (!supabase) {
      // Limpa estado local mesmo sem cliente Supabase
      setUser(null);
      setProfile(null);
      setLoading(false);
      return { error: new Error("Supabase não configurado") };
    }
    // marca como offline ao sair
    try {
      if (profile?.user_id) {
        await supabase
          .from("profiles")
          .update({ presence_status: "offline", last_seen_at: new Date().toISOString() })
          .eq("user_id", profile.user_id);
      }
    } catch {}
    const { error } = await supabase.auth.signOut();
    // Proativamente limpa estado local e encerra loading
    setUser(null);
    setProfile(null);
    setLoading(false);
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
    const query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const { data, error } = profile?.company_id
      ? await query.eq("company_id", profile.company_id)
      : await query;
    return { data: data ?? [], error };
  }

  async function updateProfile(userId: string, updates: Partial<ProfileRow>) {
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId);
    return { error };
  }

  return {
    user,
    profile,
    loading,
    isMaster,
    isAdmin,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    listProfilesByCompany,
    updateProfile,
  };
}