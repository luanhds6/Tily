import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./supabase.types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient<Database> | null = null;

if (url && anonKey) {
  client = createClient<Database>(url, anonKey);
}

export const supabase: SupabaseClient<Database> | null = client;
export const isSupabaseEnabled = !!client;

// Helper: obter o perfil do usuário autenticado
export type ProfileRow = Tables<"profiles">;

export async function getCurrentProfile(): Promise<{
  data: ProfileRow | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error("Supabase não configurado") };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: authError };
  const user = authData?.user;
  if (!user) return { data: null, error: new Error("Usuário não autenticado") };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return { data, error: error ?? null };
}

// Helper: obter a empresa atual a partir do perfil do usuário
export type CompanyRow = Tables<"companies">;

export async function getCurrentCompany(): Promise<{
  data: CompanyRow | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error("Supabase não configurado") };

  const { data: profile, error: profileError } = await getCurrentProfile();
  if (profileError) return { data: null, error: profileError };
  if (!profile) return { data: null, error: new Error("Perfil não encontrado") };

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .maybeSingle();

  return { data, error: error ?? null };
}