-- Firefly OS v0.3.1 — Developer invitations and role-based access
-- Run this entire file once in the Supabase SQL Editor before deploying v0.3.1.

create table if not exists public.workspace_member_business_access (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  business text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, business)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'member', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, email)
);

alter table public.workspace_member_business_access enable row level security;
alter table public.workspace_invitations enable row level security;

create or replace function public.firefly_member_role(target_workspace uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
  limit 1
$$;

create or replace function public.firefly_is_developer(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.firefly_member_role(target_workspace) = 'admin', false)
$$;

create or replace function public.firefly_can_edit(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.firefly_member_role(target_workspace) in ('admin', 'member'), false)
$$;

create or replace function public.firefly_has_business_access(target_workspace uuid, target_business text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and (
        wm.role = 'admin'
        or not exists (
          select 1 from public.workspace_member_business_access a
          where a.workspace_id = target_workspace and a.user_id = auth.uid()
        )
        or exists (
          select 1 from public.workspace_member_business_access a
          where a.workspace_id = target_workspace
            and a.user_id = auth.uid()
            and a.business = target_business
        )
      )
  )
$$;

revoke all on function public.firefly_member_role(uuid) from public;
revoke all on function public.firefly_is_developer(uuid) from public;
revoke all on function public.firefly_can_edit(uuid) from public;
revoke all on function public.firefly_has_business_access(uuid, text) from public;
grant execute on function public.firefly_member_role(uuid) to authenticated;
grant execute on function public.firefly_is_developer(uuid) to authenticated;
grant execute on function public.firefly_can_edit(uuid) to authenticated;
grant execute on function public.firefly_has_business_access(uuid, text) to authenticated;

drop policy if exists "v031_access_read_own_or_developer" on public.workspace_member_business_access;
create policy "v031_access_read_own_or_developer"
on public.workspace_member_business_access for select to authenticated
using (user_id = auth.uid() or public.firefly_is_developer(workspace_id));

drop policy if exists "v031_invitations_developer_read" on public.workspace_invitations;
create policy "v031_invitations_developer_read"
on public.workspace_invitations for select to authenticated
using (public.firefly_is_developer(workspace_id));

grant select on public.workspace_member_business_access to authenticated;
grant select on public.workspace_invitations to authenticated;

-- Business-scoped reads. These are restrictive policies and therefore narrow
-- the existing workspace membership policies without replacing them.
drop policy if exists "v031_tasks_business_scope" on public.tasks;
create policy "v031_tasks_business_scope"
on public.tasks as restrictive for select to authenticated
using (public.firefly_has_business_access(workspace_id, business));

drop policy if exists "v031_loans_business_scope" on public.loans;
create policy "v031_loans_business_scope"
on public.loans as restrictive for select to authenticated
using (public.firefly_has_business_access(workspace_id, 'Firefly Mortgage'));

drop policy if exists "v031_meetings_business_scope" on public.meetings;
create policy "v031_meetings_business_scope"
on public.meetings as restrictive for select to authenticated
using (public.firefly_has_business_access(workspace_id, 'Cross-Business / AI'));

-- Viewer/editor/developer write enforcement.
drop policy if exists "v031_tasks_insert_editors" on public.tasks;
create policy "v031_tasks_insert_editors"
on public.tasks as restrictive for insert to authenticated
with check (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, business));

drop policy if exists "v031_tasks_update_editors" on public.tasks;
create policy "v031_tasks_update_editors"
on public.tasks as restrictive for update to authenticated
using (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, business))
with check (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, business));

drop policy if exists "v031_tasks_delete_editors" on public.tasks;
create policy "v031_tasks_delete_editors"
on public.tasks as restrictive for delete to authenticated
using (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, business));

drop policy if exists "v031_loans_update_editors" on public.loans;
create policy "v031_loans_update_editors"
on public.loans as restrictive for update to authenticated
using (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, 'Firefly Mortgage'))
with check (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, 'Firefly Mortgage'));

drop policy if exists "v031_meetings_insert_editors" on public.meetings;
create policy "v031_meetings_insert_editors"
on public.meetings as restrictive for insert to authenticated
with check (public.firefly_can_edit(workspace_id) and public.firefly_has_business_access(workspace_id, 'Cross-Business / AI'));

drop policy if exists "v031_members_insert_developers" on public.workspace_members;
create policy "v031_members_insert_developers"
on public.workspace_members as restrictive for insert to authenticated
with check (public.firefly_is_developer(workspace_id));

drop policy if exists "v031_members_update_developers" on public.workspace_members;
create policy "v031_members_update_developers"
on public.workspace_members as restrictive for update to authenticated
using (public.firefly_is_developer(workspace_id))
with check (public.firefly_is_developer(workspace_id));

drop policy if exists "v031_members_delete_developers" on public.workspace_members;
create policy "v031_members_delete_developers"
on public.workspace_members as restrictive for delete to authenticated
using (public.firefly_is_developer(workspace_id));

-- Verification output: at least one row should show role = admin.
select p.email, wm.role, w.name as workspace_name
from public.workspace_members wm
join public.profiles p on p.id = wm.user_id
join public.workspaces w on w.id = wm.workspace_id
order by wm.role, p.email;
