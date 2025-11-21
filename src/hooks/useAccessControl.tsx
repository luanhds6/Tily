import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseEnabled } from "../lib/supabase";

export type AccessPermissions = {
  role: "guest" | "user" | "master";
  permissions: Record<string, boolean>;
  can_manage_company: boolean;
};

const defaultPerms: AccessPermissions = {
  role: "guest",
  can_manage_company: false,
  permissions: {
    dashboard: false,
    tickets: true,
    chat: true,
    meetings: false,
    profile: true,
    settings: true,
    users_management: false,
    analytics: false,
    knowledge: false,
    informativos: true,
    quick_links: false,
  },
};

export function useAccessControl(session: { id: string; role: "user" | "master" } | null) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; perms: AccessPermissions }>({
    loading: true,
    error: null,
    perms: defaultPerms,
  });

  const defaultAllowAll = useMemo(
    () => Object.fromEntries(Object.keys(defaultPerms.permissions).map((k) => [k, true])) as Record<string, boolean>,
    [],
  );

  useEffect(() => {
    if (!session) {
      setState({ loading: false, error: null, perms: defaultPerms });
      return;
    }

    async function computeEffectivePerms() {
      // 1) Se não temos sessão, aplica defaults
      if (!session) {
        setState({ loading: false, error: null, perms: defaultPerms });
        return;
      }

      // 2) Role efetiva é definida apenas pelo Supabase; ignoramos qualquer metadado/local
      let finalRole: "user" | "master" = "user";

      // 3) Se Supabase habilitado, confirma papel MASTER via perfil ou categoria 'admin'
      let isAdminCategory = false;
      let isMasterProfile = false;
      if (isSupabaseEnabled && supabase) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("is_master")
            .eq("user_id", session.id)
            .maybeSingle();
          isMasterProfile = !!prof?.is_master;
        } catch {}

        try {
          // Verifica vínculo com categoria 'admin'
          const { data: rows } = await supabase
            .from("user_access_categories")
            .select("category_id, access_categories(key)")
            .eq("user_id", session.id);
          isAdminCategory = (rows || []).some((r: any) => (r as any)?.access_categories?.key === "admin");
        } catch {}

        if (isMasterProfile || isAdminCategory) {
          finalRole = "master";
        }
      }

      // 4) MASTER tem acesso total
      if (finalRole === "master") {
        setState({
          loading: false,
          error: null,
          perms: { role: "master", can_manage_company: true, permissions: defaultAllowAll },
        });
        return;
      }

      // 5) Usuário comum: busca permissões efetivas direto do Supabase
      if (isSupabaseEnabled && supabase) {
        try {
          // Tenta RPC get_effective_permissions(p_user_id)
          const { data, error } = await supabase.rpc("get_effective_permissions" as any, { p_user_id: session.id });
          if (!error && data && typeof data === "object") {
            const json = data as Record<string, boolean>;
            const merged: Record<string, boolean> = { ...defaultPerms.permissions };
            for (const key of Object.keys(merged)) {
              if (json[key] === true || json[key] === false) merged[key] = !!json[key];
            }
            setState({
              loading: false,
              error: null,
              perms: { role: "user", can_manage_company: false, permissions: merged },
            });
            return;
          }
        } catch (e: any) {
          // Continua para fallback
        }

        // Fallback: agrega permissões pelas categorias atribuídas ao usuário
        try {
          const { data: rows, error } = await supabase
            .from("access_category_permissions")
            .select("resource_key, allow, category_id, user_access_categories!inner(user_id)")
            .eq("user_access_categories.user_id", session.id);
          if (!error && rows && Array.isArray(rows)) {
            const permsMap: Record<string, boolean> = { ...defaultPerms.permissions };
            for (const row of rows as any[]) {
              const k = (row as any).resource_key as string;
              const allowed = !!(row as any).allow;
              if (k in permsMap) permsMap[k] = permsMap[k] || allowed; // union: se qualquer categoria permitir, habilita
            }
            setState({ loading: false, error: null, perms: { role: "user", can_manage_company: false, permissions: permsMap } });
            return;
          }
        } catch {}
      }

      // 6) Último recurso: defaults para usuário
      setState({ loading: false, error: null, perms: { ...defaultPerms, role: "user" } });
    }

    computeEffectivePerms();
    // Assina mudanças relevantes para recalcular permissões em tempo real
    let channel: any = null;
    if (isSupabaseEnabled && supabase && session?.id) {
      try {
        channel = supabase
          .channel(`access_${session.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${session.id}` }, () => computeEffectivePerms())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_access_categories', filter: `user_id=eq.${session.id}` }, () => computeEffectivePerms())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'access_category_permissions' }, () => computeEffectivePerms())
          .subscribe();
      } catch {}
    }

    return () => {
      try {
        if (channel && supabase) {
          const state = (channel as any)?.state;
          if (state === "joined" || state === "joining" || state === "leaving") {
            Promise.resolve((channel as any)?.unsubscribe?.()).catch(() => {});
          }
        }
      } catch {}
    };
  }, [session, defaultAllowAll]);

  return state;
}
