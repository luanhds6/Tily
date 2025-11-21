-- Concede acesso MASTER (admin) para o usuário alvo
-- Execute no Supabase SQL Editor com uma conta privilegiada
-- Pré-requisito: o usuário já deve existir em auth.users (criado via sign up ou pelo Studio)

begin;

-- 1) Defina o email alvo
\set target_email 'ti@servbrasil.com.br'

-- 2) Garante a existência da categoria 'admin'
insert into public.access_categories (id, key)
select gen_random_uuid(), 'admin'
where not exists (select 1 from public.access_categories where key = 'admin');

-- 3) Resolve/Cria empresa com base no domínio do email
with c as (
  select coalesce(
    (select id from public.companies where domain = lower(split_part(:target_email, '@', 2)) limit 1),
    (select id from (
      insert into public.companies (id, name, domain, created_at, updated_at)
      values (gen_random_uuid(), initcap(lower(split_part(:target_email, '@', 2))), lower(split_part(:target_email, '@', 2)), now(), now())
      returning id
    ) ins)
  ) as company_id
), u as (
  select id::uuid as user_id
  from auth.users
  where lower(email) = lower(:target_email)
  limit 1
)

-- 4) Upsert no perfil do usuário para master/admin/ativo e amarrar à empresa
insert into public.profiles (user_id, company_id, full_name, phone, role, is_master, is_active, created_at, updated_at)
select u.user_id, c.company_id, 'Luan TI'::text, null::text, 'admin', true, true, now(), now()
from u cross join c
on conflict (user_id) do update set
  company_id = excluded.company_id,
  role = 'admin',
  is_master = true,
  is_active = true,
  updated_at = now();

-- 5) Vincula o usuário à categoria 'admin' (necessário para passar nas políticas RLS)
insert into public.user_access_categories (user_id, category_id, assigned_at)
select u.user_id, ac.id, now()
from (
  select id::uuid as user_id from auth.users where lower(email) = lower(:target_email) limit 1
) u
join public.access_categories ac on ac.key = 'admin'
on conflict (user_id, category_id) do nothing;

commit;

-- Após executar:
-- - O usuário terá perfil com is_master=true e role='admin'
-- - Estará vinculado à categoria 'admin'
-- - Terá acesso total conforme políticas RLS
-- Se o usuário ainda não existir, crie-o primeiro (via Studio > Authentication > Add user ou signUp).