-- Quick Link Folders schema and policies
-- Run this in Supabase SQL editor or migrate via CLI.

-- 1) Tables
create table if not exists public.quick_link_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  visibility text not null check (visibility in ('public','restricted')),
  created_at timestamptz not null default now()
);

create table if not exists public.quick_link_folder_members (
  folder_id uuid not null references public.quick_link_folders(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  primary key (folder_id, user_id)
);

-- 2) Add folder_id to quick_links if missing
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quick_links'
      and column_name = 'folder_id'
  ) then
    alter table public.quick_links
      add column folder_id uuid null;
    alter table public.quick_links
      add constraint quick_links_folder_fk
      foreign key (folder_id) references public.quick_link_folders(id)
      on delete set null;
    create index if not exists quick_links_folder_id_idx on public.quick_links (folder_id);
  end if;
end $$;

-- 3) Indexes
create index if not exists quick_link_folders_company_idx on public.quick_link_folders (company_id);
create index if not exists quick_link_folder_members_user_idx on public.quick_link_folder_members (user_id);

-- 4) Enable RLS
alter table public.quick_link_folders enable row level security;
alter table public.quick_link_folder_members enable row level security;

-- 5) Policies
-- Assumes public.profiles has (user_id uuid, company_id uuid, is_master boolean)

-- Folders: select
create policy if not exists folders_select on public.quick_link_folders
for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = quick_link_folders.company_id
  )
  and (
    visibility = 'public'
    or exists (
      select 1 from public.profiles p2
      where p2.user_id = auth.uid()
        and p2.company_id = quick_link_folders.company_id
        and p2.is_master = true
    )
    or exists (
      select 1 from public.quick_link_folder_members m
      where m.folder_id = quick_link_folders.id
        and m.user_id = auth.uid()
    )
  )
);

-- Folders: CRUD only by master
create policy if not exists folders_crud_master on public.quick_link_folders
for all using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = quick_link_folders.company_id
      and p.is_master = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.company_id = quick_link_folders.company_id
      and p.is_master = true
  )
);

-- Folder members: select allowed to company members
create policy if not exists members_select on public.quick_link_folder_members
for select using (
  exists (
    select 1
    from public.quick_link_folders f
    join public.profiles p on p.company_id = f.company_id
    where f.id = quick_link_folder_members.folder_id
      and p.user_id = auth.uid()
  )
);

-- Folder members: CRUD only by master of the folder's company
create policy if not exists members_crud_master on public.quick_link_folder_members
for all using (
  exists (
    select 1
    from public.quick_link_folders f
    join public.profiles p on p.company_id = f.company_id
    where f.id = quick_link_folder_members.folder_id
      and p.user_id = auth.uid()
      and p.is_master = true
  )
)
with check (
  exists (
    select 1
    from public.quick_link_folders f
    join public.profiles p on p.company_id = f.company_id
    where f.id = quick_link_folder_members.folder_id
      and p.user_id = auth.uid()
      and p.is_master = true
  )
);

-- Done