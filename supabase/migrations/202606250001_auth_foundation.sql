alter table public.users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists must_change_password boolean not null default false;

alter table public.users
  alter column password drop not null;

create or replace function public.revoke_auth_sessions(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = target_user_id;
$$;

revoke all on function public.revoke_auth_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_auth_sessions(uuid) to service_role;
