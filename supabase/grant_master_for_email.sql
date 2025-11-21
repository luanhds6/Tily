-- Conceder acesso master (admin) para um usuário por email
-- Execute este script no Supabase SQL Editor (Project > SQL editor)
-- IMPORTANTE: o usuário precisa existir em auth.users (faça sign up antes)

begin;

-- 1) Definir o email alvo
-- Altere aqui se precisar outro email
\set target_email 'ti@servbrasil.com.br'

-- 2) Garantir que a categoria 'admin' exista
insert into public.access_categories (id, key)
select gen_random_uuid(), 'admin'
where not exists (select 1 from public.access_categories where key = 'admin');

-- 3) Resolver user_id a partir do email (em auth.users)
with u as (
  select id::uuid as user_id, email
  from auth.users
  where lower(email) = lower(:target_email)
  limit 1
), c as (
  -- Resolve/Cria empresa pelo domínio do email
  select coalesce(
    (
      select id from public.companies
      where domain = lower(split_part(:target_email, '@', 2))
      limit 1
    ), (
      -- Cria empresa caso não exista
      select id from (
        insert into public.companies (id, name, domain, created_at, updated_at)
        values (gen_random_uuid(), initcap(lower(split_part(:target_email, '@', 2))), lower(split_part(:target_email, '@', 2)), now(), now())
        returning id
      ) ins
    )
  ) as company_id
)
-- 4) Upsert do perfil como master/admin/ativo
insert into public.profiles (user_id, company_id, full_name, phone, role, is_master, is_active, created_at, updated_at)
select u.user_id, c.company_id, null::text, null::text, 'admin', true, true, now(), now()
from u cross join c
on conflict (user_id) do update set
  company_id = excluded.company_id,
  role = 'admin',
  is_master = true,
  is_active = true,
  updated_at = now();

-- 5) Vincular usuário à categoria 'admin'
insert into public.user_access_categories (user_id, category_id, assigned_at)
select u.user_id, ac.id, now()
from (
  select id::uuid as user_id from auth.users where lower(email) = lower(:target_email) limit 1
) u
join public.access_categories ac on ac.key = 'admin'
on conflict (user_id, category_id) do nothing;

commit;

-- Após executar:
-- - O usuário terá perfil com is_master = true e role = 'admin'
-- - Estará vinculado à categoria 'admin' (acesso total conforme políticas)
-- Se o usuário não existir em auth.users, primeiro crie o usuário (signUp).