import { useState, useEffect } from "react";

const LS_USERS = "sc_users_v2";
const LS_SESSION = "sc_session_v2";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "master" | "admin" | "user";
  active: boolean;
  avatar?: string;
  department?: string;
}

export interface Session {
  id: string;
  name: string;
  email: string;
  role: "master" | "admin" | "user";
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadJSON(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

function ensureSeedData() {
  const users = loadJSON(LS_USERS, null);
  if (!users) {
    const seedUsers: User[] = [
      {
        id: uid("u"),
        name: "Admin Master",
        email: "master@local",
        password: "master123",
        role: "master",
        active: true,
        department: "TI",
      },
      {
        id: uid("u"),
        name: "Carlos Silva",
        email: "admin@local",
        password: "admin123",
        role: "admin",
        active: true,
        department: "Suporte",
      },
      {
        id: uid("u"),
        name: "Ana Santos",
        email: "ana@local",
        password: "admin123",
        role: "admin",
        active: true,
        department: "Suporte",
      },
      {
        id: uid("u"),
        name: "João Usuário",
        email: "joao@local",
        password: "user123",
        role: "user",
        active: true,
        department: "Vendas",
      },
    ];
    saveJSON(LS_USERS, seedUsers);
  }
}

export function useAuth() {
  ensureSeedData();

  const [users, setUsers] = useState<User[]>(() => loadJSON(LS_USERS, []));
  const [session, setSession] = useState<Session | null>(() => loadJSON(LS_SESSION, null));

  useEffect(() => {
    saveJSON(LS_USERS, users);
  }, [users]);

  useEffect(() => {
    saveJSON(LS_SESSION, session);
  }, [session]);

  const login = (email: string, password: string): boolean => {
    const user = users.find((u) => u.email === email && u.password === password && u.active);
    if (user) {
      setSession({ id: user.id, name: user.name, email: user.email, role: user.role });
      return true;
    }
    return false;
  };

  const logout = () => {
    setSession(null);
  };

  const createUser = (data: Omit<User, "id">): User => {
    if (!session || session.role !== "master") {
      throw new Error("Apenas Master pode criar usuários");
    }
    if (users.some((u) => u.email === data.email)) {
      throw new Error("Email já cadastrado");
    }
    const newUser: User = { id: uid("u"), ...data };
    setUsers((prev) => [newUser, ...prev]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    if (!session || session.role !== "master") {
      throw new Error("Apenas Master pode editar usuários");
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUser = (id: string) => {
    if (!session || session.role !== "master") {
      throw new Error("Apenas Master pode excluir usuários");
    }
    if (confirm("Confirmar exclusão do usuário?")) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  // Permite qualquer usuário logado atualizar o próprio avatar
  const setMyAvatar = (avatarDataUrl: string) => {
    if (!session) return;
    setUsers((prev) => prev.map((u) => (u.id === session.id ? { ...u, avatar: avatarDataUrl } : u)));
  };

  const getAdminUsers = () => {
    return users.filter((u) => (u.role === "admin" || u.role === "master") && u.active);
  };

  return {
    users,
    session,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    getAdminUsers,
    isAdmin: session?.role === "admin" || session?.role === "master",
    isMaster: session?.role === "master",
    setMyAvatar,
  };
}
