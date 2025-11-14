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

// Helper: extrair domínio do email
function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1).toLowerCase();
}

// Helper: garantir que o usuário tenha um profile; cria com empresa resolvida
export async function ensureProfileForUser(user: { id: string; email: string | null }): Promise<{ ok: boolean; error: Error | null }>{
  if (!supabase) return { ok: false, error: new Error("Supabase não configurado") };
  // Já existe?
  const { data: existing, error: existingErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingErr) return { ok: false, error: existingErr };
  if (existing) return { ok: true, error: null };

  // Resolver empresa por domínio exato; criar se não existir
  const dom = emailDomain(user.email);
  if (!dom) return { ok: false, error: new Error("Email inválido para derivar domínio da empresa") };

  // Apenas resolve empresa existente; não cria do lado do cliente para evitar 403/RLS.
  const { data: byDomain } = await supabase
    .from("companies")
    .select("id,domain,is_active")
    .eq("domain", dom)
    .maybeSingle();
  const companyId: string | null = byDomain?.id ?? null;
  if (!companyId) {
    return { ok: false, error: new Error("Empresa não encontrada para o domínio do email") };
  }

  const { error: insertErr } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      company_id: companyId,
      role: "user",
      is_active: true,
      is_master: false,
      full_name: null,
      phone: null,
    });
  if (insertErr) return { ok: false, error: insertErr };
  return { ok: true, error: null };
}
