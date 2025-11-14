-- ... existing code ...

-- Buckets de Storage e políticas (idempotente, sem usar storage.create_bucket)
do $$
begin
  -- Executa somente se o schema storage existir
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    -- Cria buckets se não existirem
    insert into storage.buckets (id, name, public)
    select 'avatars', 'avatars', true
    where not exists (select 1 from storage.buckets where id = 'avatars');

    insert into storage.buckets (id, name, public)
    select 'meetings', 'meetings', true
    where not exists (select 1 from storage.buckets where id = 'meetings');

    -- Políticas: somente se tabela storage.objects existir
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'storage' and table_name = 'objects'
    ) then
      -- Leitura pública
      drop policy if exists "Public read for avatars and meetings" on storage.objects;
      create policy "Public read for avatars and meetings"
      on storage.objects
      for select
      to public
      using (bucket_id in ('avatars','meetings'));

      -- Inserção por autenticados
      drop policy if exists "Authenticated insert avatars and meetings" on storage.objects;
      create policy "Authenticated insert avatars and meetings"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id in ('avatars','meetings'));

      -- Atualização por autenticados
      drop policy if exists "Authenticated update avatars and meetings" on storage.objects;
      create policy "Authenticated update avatars and meetings"
      on storage.objects
      for update
      to authenticated
      using (bucket_id in ('avatars','meetings'))
      with check (bucket_id in ('avatars','meetings'));

      -- Exclusão por autenticados
      drop policy if exists "Authenticated delete avatars and meetings" on storage.objects;
      create policy "Authenticated delete avatars and meetings"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id in ('avatars','meetings'));
    end if;
  end if;
end $$;

-- Atualiza cache do PostgREST para que tudo apareça imediatamente
notify pgrst, 'reload schema';

-- ... existing code ...

-- Tables necessárias pelo app (idempotentes)
create table if not exists public.quick_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  title text not null,
  url text not null,
  icon text null,
  created_at timestamptz not null default now()
);

alter table public.quick_links enable row level security;
drop policy if exists "quick_links_select_by_company" on public.quick_links;
create policy "quick_links_select_by_company"
  on public.quick_links
  for select
  to authenticated
  using (
    company_id = (
      select p.company_id from public.profiles p where p.user_id = auth.uid()
    )
  );

drop policy if exists "quick_links_admin_write" on public.quick_links;
create policy "quick_links_admin_write"
  on public.quick_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  );

create table if not exists public.tickets (
  id text primary key,
  author_id text not null,
  author_name text not null,
  title text not null,
  description text null,
  category text not null,
  priority text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null,
  assigned_to text null,
  assigned_to_name text null,
  tags text[] not null default '{}'::text[],
  sla integer not null default 24
);

alter table public.tickets enable row level security;
drop policy if exists "tickets_select_all_authenticated" on public.tickets;
create policy "tickets_select_all_authenticated"
  on public.tickets
  for select
  to authenticated
  using (true);

drop policy if exists "tickets_author_or_admin_write" on public.tickets;
create policy "tickets_author_or_admin_write"
  on public.tickets
  for all
  to authenticated
  using (
    author_id = auth.uid() or exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid() or exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  );

create table if not exists public.messages (
  id text primary key,
  ticket_id text not null references public.tickets(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  text text null,
  attachments jsonb[] not null default '{}'::jsonb[],
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
drop policy if exists "messages_select_all_authenticated" on public.messages;
create policy "messages_select_all_authenticated"
  on public.messages
  for select
  to authenticated
  using (true);

drop policy if exists "messages_author_or_admin_insert" on public.messages;
create policy "messages_author_or_admin_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    author_id = auth.uid() or exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  );

create table if not exists public.chat_messages (
  id text primary key,
  room_id text not null,
  sender_id text not null,
  sender_name text not null,
  text text null,
  attachments jsonb[] not null default '{}'::jsonb[],
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
drop policy if exists "chat_messages_select_all_authenticated" on public.chat_messages;
create policy "chat_messages_select_all_authenticated"
  on public.chat_messages
  for select
  to authenticated
  using (true);

drop policy if exists "chat_messages_sender_or_admin_insert" on public.chat_messages;
create policy "chat_messages_sender_or_admin_insert"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid() or exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  );

create table if not exists public.informativos (
  id text primary key,
  title text not null,
  content text not null,
  type text not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  created_by_name text not null
);

alter table public.informativos enable row level security;
drop policy if exists "informativos_select_all_authenticated" on public.informativos;
create policy "informativos_select_all_authenticated"
  on public.informativos
  for select
  to authenticated
  using (true);

drop policy if exists "informativos_admin_insert" on public.informativos;
create policy "informativos_admin_insert"
  on public.informativos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_access_categories uac
      join public.access_categories ac on ac.id = uac.category_id
      where ac.key = 'admin' and uac.user_id = auth.uid()
    )
  );

-- Atualiza cache do PostgREST após criar tabelas/políticas
notify pgrst, 'reload schema';
