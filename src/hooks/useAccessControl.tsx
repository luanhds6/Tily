import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  const [state, setState] = useState<{ loading: boolean; error: string | null; perms: AccessPermissions }>(
    { loading: true, error: null, perms: defaultPerms },
  );

  useEffect(() => {
    if (!session) {
      setState({ loading: false, error: null, perms: defaultPerms });
      return;
    }

    async function computeEffectivePerms() {
      // Temporariamente desativado: evitar erro PGRST202 enquanto RPC não existe no backend
      // Fallback: usa somente a role da sessão
      const allowAll = Object.fromEntries(Object.keys(defaultPerms.permissions).map((k) => [k, true])) as Record<string, boolean>;
      // Considera também a role persistida para evitar regressão após refresh (localStorage prioritário)
      let storedRole: "master" | "user" | null = null;
      try {
        const key = `effective_role:${session.id}`;
        let raw = "";
        try { raw = (localStorage.getItem(key) || ""); } catch {}
        if (!raw) { try { raw = (sessionStorage.getItem(key) || ""); } catch {} }
        raw = raw.toLowerCase();
        if (raw === "admin") storedRole = "master"; // backcompat
        else if (raw === "master" || raw === "user") storedRole = raw as any;
      } catch {}

      const finalRole = (storedRole || session.role) as "user" | "master";
      if (finalRole === "master") {
        setState({
          loading: false,
          error: null,
          perms: { role: "master", can_manage_company: true, permissions: allowAll },
        });
        return;
      }
      setState({ loading: false, error: null, perms: { ...defaultPerms, role: "user" } });
    }

    computeEffectivePerms();
  }, [session]);

  return state;
}
