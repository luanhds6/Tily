import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrentProfile, type ProfileRow } from "../lib/supabase";

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

    async function bootstrap() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const authUser = data.user ? { id: data.user.id, email: data.user.email } : null;
      if (!mounted) return;
      setUser(authUser);
      if (authUser) {
        const { data: p } = await getCurrentProfile();
        if (!mounted) return;
        setProfile(p);
      }
      setLoading(false);
    }

    bootstrap();

    const { data: sub } = supabase?.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ? { id: session.user.id, email: session.user.email } : null;
      setUser(nextUser);
      if (nextUser) {
        const { data: p } = await getCurrentProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
    }) ?? { data: { subscription: { unsubscribe() {} } } };

    return () => {
      mounted = false;
      // @ts-ignore
      sub.subscription?.unsubscribe?.();
    };
  }, []);

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
    if (!supabase) return { error: new Error("Supabase não configurado") };
    const { error } = await supabase.auth.signOut();
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
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