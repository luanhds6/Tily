import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!session) {
      setState({ loading: false, error: null, perms: defaultPerms });
      return;
    }

    const allowAll = Object.fromEntries(
      Object.keys(defaultPerms.permissions).map((k) => [k, true]),
    ) as Record<string, boolean>;

    if (session.role === "master") {
      setState({
        loading: false,
        error: null,
        perms: {
          role: "master",
          can_manage_company: true,
          permissions: allowAll,
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
          permissions: {
            ...allowAll,
          },
        },
      });
      return;
    }

    setState({
      loading: false,
      error: null,
      perms: {
        ...defaultPerms,
        role: "user",
      },
    });
  }, [session]);

  return state;
}