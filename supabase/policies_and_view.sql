-- Supabase setup: fix RLS recursion on public.profiles and recreate public.auth_users_view
-- Execute this script in Supabase SQL editor (Project > SQL editor).

begin;

-- 0) Ensure schemas are accessible to authenticated role
grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
-- Optional: allow anon role to see public schema objects (for pre-login RPCs)
grant usage on schema public to anon;

-- 1) Drop the existing view (if any) to allow column changes
drop view if exists public.auth_users_view cascade;

-- 2) Recreate a simple, non-recursive view joining auth.users and public.profiles
create view public.auth_users_view as
select
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.is_master,
  p.is_active,
  p.company_id,
  p.phone,
  u.last_sign_in_at,
  p.created_at,
  p.updated_at
from auth.users u
left join public.profiles p on p.user_id = u.id;

-- 3) Grant read privileges required for the view
grant select on public.auth_users_view to authenticated;
grant usage on schema auth to authenticated;
grant select on auth.users to authenticated;

-- Optional: if you still receive 403 due to role resolution, grant to anon too.
-- Uncomment if necessary (be aware of exposure of emails via the view to unauthenticated calls):
-- grant usage on schema auth to anon;
-- grant select on auth.users to anon;
-- grant select on public.auth_users_view to anon;

-- 4) Clean up existing policies on profiles to avoid recursion
alter table public.profiles enable row level security;

do $$
declare pol record;
begin
  for pol in
    select polname from pg_catalog.pg_policy where polrelid = 'public.profiles'::regclass
  loop
    execute format('drop policy if exists %I on public.profiles', pol.polname);
  end loop;
end $$;

-- 5) Create safe policies for profiles (self-access + admin via user_access_categories)

-- Self can read own profile
create policy profiles_select_self
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Self can insert own profile
create policy profiles_insert_self
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Self can update own profile
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admins (defined via user_access_categories/access_categories) can read all profiles
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where uac.user_id = auth.uid()
        and ac.key = 'admin'
    )
  );

-- Admins can update any profile
create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where uac.user_id = auth.uid()
        and ac.key = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where uac.user_id = auth.uid()
        and ac.key = 'admin'
    )
  );

-- 6) Grant base table privileges (RLS will still enforce restrictions)
grant select, insert, update on public.profiles to authenticated;

-- 7) Seed the 'admin' category key if it doesn't exist
insert into public.access_categories (id, key)
select gen_random_uuid(), 'admin'
where not exists (select 1 from public.access_categories where key = 'admin');

commit;

-- After running this script, assign admin to a specific user (replace YOUR_USER_UUID):
-- insert into public.user_access_categories (user_id, category_id)
-- select 'YOUR_USER_UUID', ac.id from public.access_categories ac where ac.key = 'admin'
-- on conflict (user_id, category_id) do nothing;

-- 8) Safer alternative: expose a SECURITY DEFINER RPC instead of direct view access
--    This avoids requiring client roles to have SELECT on auth.users.

-- Function returning all users with profile data
create or replace function public.get_auth_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  is_master boolean,
  is_active boolean,
  company_id uuid,
  phone text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.is_master,
    p.is_active,
    p.company_id,
    p.phone,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id;
$$;

grant execute on function public.get_auth_users() to authenticated;

-- Function returning a single user by id
create or replace function public.get_auth_user(p_user_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  is_master boolean,
  is_active boolean,
  company_id uuid,
  phone text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.is_master,
    p.is_active,
    p.company_id,
    p.phone,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where u.id = p_user_id;
$$;

grant execute on function public.get_auth_user(uuid) to authenticated;

-- Filtered by company_id
create or replace function public.get_auth_users_by_company(p_company_id uuid)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  is_master boolean,
  is_active boolean,
  company_id uuid,
  phone text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.is_master,
    p.is_active,
    p.company_id,
    p.phone,
    u.last_sign_in_at,
    p.created_at,
    p.updated_at
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  where p.company_id = p_company_id;
$$;

grant execute on function public.get_auth_users_by_company(uuid) to authenticated;

-- Optional: allow anon to call RPCs if needed (pre-login)
grant execute on function public.get_auth_users() to anon;
grant execute on function public.get_auth_user(uuid) to anon;
grant execute on function public.get_auth_users_by_company(uuid) to anon;

-- Admin-only RPC to atualizar campos do perfil de um usuário
-- Mantém compatibilidade com o frontend (payload opcional por campo)
create or replace function public.admin_update_user(
  p_user_id uuid,
  p_full_name text default null,
  p_role text default null,
  p_is_master boolean default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Verificação de autorização: requer categoria 'admin'
  if not exists (
    select 1
    from public.user_access_categories uac
    join public.access_categories ac on ac.id = uac.category_id
    where uac.user_id = auth.uid()
      and ac.key = 'admin'
  ) then
    raise insufficient_privilege using message = 'Somente administradores podem atualizar perfis';
  end if;

  -- Atualiza apenas os campos fornecidos
  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    role = coalesce(p_role, role),
    is_master = coalesce(p_is_master, is_master),
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, text, boolean, boolean) to authenticated;

-- Force PostgREST to reload schema cache immediately (fixes 404 after creating functions)
notify pgrst, 'reload schema';

-- Admin-only RPC to excluir perfil e vínculos de um usuário
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Autorização: requer categoria 'admin'
  if not exists (
    select 1
    from public.user_access_categories uac
    join public.access_categories ac on ac.id = uac.category_id
    where uac.user_id = auth.uid()
      and ac.key = 'admin'
  ) then
    raise insufficient_privilege using message = 'Somente administradores podem excluir usuários';
  end if;

  -- Opcional: impedir exclusão do master
  if exists (select 1 from public.profiles where user_id = p_user_id and is_master) then
    raise insufficient_privilege using message = 'Não é permitido excluir o usuário master';
  end if;

  -- Remove vínculos e perfil (auth.users não pode ser removido via PostgREST)
  delete from public.user_access_categories where user_id = p_user_id;
  delete from public.user_business_units where user_id = p_user_id;
  delete from public.profiles where user_id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

-- RPC para promover um usuário a master se nenhum existir
create or replace function public.bootstrap_master_if_none(
  p_user_id uuid,
  p_email text,
  p_full_name text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_exists_master boolean;
  v_domain text;
  v_company_id uuid;
begin
  -- Se já existe master, não faz nada
  select exists(select 1 from public.profiles where is_master) into v_exists_master;
  if v_exists_master then
    return jsonb_build_object('ok', false, 'error', 'master_already_exists');
  end if;

  -- Resolve domínio do email
  v_domain := lower(split_part(p_email, '@', 2));

  -- Garante empresa pelo domínio
  select c.id into v_company_id from public.companies c where c.domain = v_domain;
  if v_company_id is null then
    insert into public.companies (id, name, domain, created_at, updated_at)
    values (gen_random_uuid(), initcap(v_domain), v_domain, now(), now())
    returning id into v_company_id;
  end if;

  -- Cria/atualiza perfil como master/admin/ativo
  insert into public.profiles (user_id, company_id, full_name, phone, role, is_master, is_active, created_at, updated_at)
  values (p_user_id, v_company_id, p_full_name, p_phone, 'admin', true, true, now(), now())
  on conflict (user_id) do update set
    company_id = excluded.company_id,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = 'admin',
    is_master = true,
    is_active = true,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.bootstrap_master_if_none(uuid, text, text, text) to authenticated;

-- Atualiza cache do PostgREST após criação das funções
notify pgrst, 'reload schema';

-- RLS para user_access_categories e user_business_units (operações administrativas)
alter table if exists public.user_access_categories enable row level security;
alter table if exists public.user_business_units enable row level security;

do $$
declare pol record;
begin
  for pol in
    select polname from pg_catalog.pg_policy where polrelid = 'public.user_access_categories'::regclass
  loop
    execute format('drop policy if exists %I on public.user_access_categories', pol.polname);
  end loop;
end $$;

do $$
declare pol record;
begin
  for pol in
    select polname from pg_catalog.pg_policy where polrelid = 'public.user_business_units'::regclass
  loop
    execute format('drop policy if exists %I on public.user_business_units', pol.polname);
  end loop;
end $$;

-- Admin pode gerenciar categorias de acesso
create policy uac_admin_all on public.user_access_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.user_access_categories uac2
      join public.access_categories ac on ac.id = uac2.category_id
      where uac2.user_id = auth.uid() and ac.key = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.user_access_categories uac2
      join public.access_categories ac on ac.id = uac2.category_id
      where uac2.user_id = auth.uid() and ac.key = 'admin'
    )
  );

-- Admin pode gerenciar unidades de negócio dos usuários
create policy ubu_admin_all on public.user_business_units
  for all to authenticated
  using (
    exists (
      select 1 from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where uac.user_id = auth.uid() and ac.key = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where uac.user_id = auth.uid() and ac.key = 'admin'
    )
  );

grant select, insert, update, delete on public.user_access_categories to authenticated;
grant select, insert, update, delete on public.user_business_units to authenticated;

notify pgrst, 'reload schema';