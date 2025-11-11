import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type AccessPermissions = {
  role: "guest" | "user" | "admin" | "master";
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

export function useAccessControl(session: { id: string; role: "user" | "admin" | "master" } | null) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; perms: AccessPermissions }>(
    { loading: true, error: null, perms: defaultPerms },
  );

  useEffect(() => {
    if (!session) {
      setState({ loading: false, error: null, perms: defaultPerms });
      return;
    }

    async function computeEffectivePerms() {
      // Se houver Supabase, tenta obter as permissões efetivas via RPC
      if (supabase) {
        try {
          const { data, error } = await supabase.rpc("get_effective_permissions" as any, { p_user_id: session.id });
          if (!error && data) {
            const payload = (Array.isArray(data) ? data[0] : data) as any;
            const isMaster = payload?.is_master === true || String(payload?.role || "").toLowerCase() === "master";
            const isAdmin = String(payload?.role || "").toLowerCase() === "admin";
            const effectiveRole: AccessPermissions["role"] = isMaster ? "master" : isAdmin ? "admin" : "user";
            const allowAll = Object.fromEntries(Object.keys(defaultPerms.permissions).map((k) => [k, true])) as Record<string, boolean>;
            const permsFromDb = (payload?.permissions ?? {}) as Record<string, boolean>;
            const mergedPerms = effectiveRole === "user" ? { ...defaultPerms.permissions, ...permsFromDb } : { ...allowAll, ...permsFromDb };
            const canManageCompany = isMaster || !!payload?.can_manage_company;
            setState({
              loading: false,
              error: null,
              perms: {
                role: effectiveRole,
                can_manage_company: canManageCompany,
                permissions: mergedPerms,
              },
            });
            return;
          }
        } catch (err: any) {
          // Continua para o fallback baseado na role da sessão
          console.warn("Falha ao obter permissões efetivas (RPC):", err?.message || err);
        }
      }

      // Fallback: usa somente a role da sessão
      const allowAll = Object.fromEntries(Object.keys(defaultPerms.permissions).map((k) => [k, true])) as Record<string, boolean>;
      if (session.role === "master") {
        setState({
          loading: false,
          error: null,
          perms: { role: "master", can_manage_company: true, permissions: allowAll },
        });
        return;
      }
      if (session.role === "admin") {
        setState({
          loading: false,
          error: null,
          perms: { role: "admin", can_manage_company: false, permissions: { ...allowAll } },
        });
        return;
      }
      setState({ loading: false, error: null, perms: { ...defaultPerms, role: "user" } });
    }

    computeEffectivePerms();
  }, [session]);

  return state;
}