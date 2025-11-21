-- Excluir COMPLETAMENTE os dados de um usuário por email
-- Execute este script no Supabase Studio (SQL Editor)
-- ATENÇÃO: operação destrutiva. Não pode ser desfeita.

begin;

-- 1) Defina o email alvo
\set target_email 'ti@servbrasil.com.br'

-- 2) Resolver user_id a partir do email (em auth.users)
with u as (
  select id::uuid as user_id
  from auth.users
  where lower(email) = lower(:target_email)
  limit 1
)

-- 3) Excluir dados de domínio da aplicação
-- 3.1) Mensagens de chat enviadas pelo usuário ou no seu room privado
delete from public.chat_messages
using u
where public.chat_messages.sender_id = u.user_id::text
   or public.chat_messages.room_id = u.user_id::text;

-- 3.2) Mensagens em tickets escritas pelo usuário
delete from public.messages
using u
where public.messages.author_id = u.user_id::text;

-- 3.3) Tickets criados pelo usuário (cascateia para mensagens do ticket)
delete from public.tickets
using u
where public.tickets.author_id = u.user_id::text;

-- 3.4) Limpar atribuições de tickets para o usuário (não exclui tickets de terceiros)
update public.tickets
set assigned_to = null,
    assigned_to_name = null
from u
where public.tickets.assigned_to = u.user_id::text;

-- 3.5) Informativos criados pelo usuário
delete from public.informativos
using u
where public.informativos.created_by = u.user_id::text;

-- 4) Excluir vínculos e perfil
delete from public.user_access_categories using u where user_id = u.user_id;
delete from public.user_business_units using u where user_id = u.user_id;
delete from public.profiles using u where user_id = u.user_id;

-- 5) Excluir o usuário em auth.users
delete from auth.users using u where auth.users.id = u.user_id;

commit;

-- PASSOS ADICIONAIS (manuais):
-- - Remover avatar do usuário no bucket 'avatars' se existir.
--   Use o Storage browser e apague objetos cujo caminho contenha o user_id.
-- - Se existirem arquivos no bucket 'meetings' ligados ao usuário, apague-os.