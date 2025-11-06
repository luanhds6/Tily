import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    chat: false,
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

  const isAdminLike = useMemo(() => session?.role === "admin" || session?.role === "master", [session?.role]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!session || !supabase) {
        // Fallback local: assume padrão por papel
        if (!session) {
          setState({ loading: false, error: null, perms: defaultPerms });
          return;
        }
        if (session.role === "master") {
          setState({
            loading: false,
            error: null,
            perms: {
              role: "master",
              can_manage_company: true,
              permissions: Object.fromEntries(
                Object.keys(defaultPerms.permissions).map((k) => [k, true]),
              ),
            },
          });
          return;
        }
        if (session.role === "admin") {
          setState({
            loading: false,
            error: null,
            perms: {
              role: "admin",
              can_manage_company: false,
              permissions: Object.fromEntries(
                Object.keys(defaultPerms.permissions).map((k) => [k, true]),
              ),
            },
          });
          return;
        }
        setState({ loading: false, error: null, perms: defaultPerms });
        return;
      }

      try {
        const { data, error } = await supabase.rpc("get_effective_permissions", { p_user_id: session.id });
        if (error) throw error;
        if (!data) {
          setState({ loading: false, error: null, perms: defaultPerms });
          return;
        }
        if (!cancelled) setState({ loading: false, error: null, perms: data as AccessPermissions });
      } catch (err: any) {
        if (!cancelled) setState({ loading: false, error: err.message ?? String(err), perms: defaultPerms });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [session?.id, session?.role]);

  return state;
}