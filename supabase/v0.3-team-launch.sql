-- Firefly OS v0.3.0 — Team Launch
-- Run once in the Supabase SQL Editor after v0.2.1 is deployed.
-- This migration preserves existing people, tasks, loans and meetings.

alter table public.people add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.people add column if not exists app_role text not null default 'member';
alter table public.people add column if not exists business_access text[] not null default '{}';
alter table public.people add column if not exists status text not null default 'not_invited';
alter table public.people add column if not exists invited_at timestamptz;
alter table public.people add column if not exists joined_at timestamptz;
alter table public.people add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.people add constraint people_app_role_check
    check (app_role in ('admin','manager','member'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.people add constraint people_status_check
    check (status in ('not_invited','invited','active','disabled'));
exception when duplicate_object then null; end $$;

create unique index if not exists people_user_id_unique
  on public.people(user_id) where user_id is not null;
create unique index if not exists people_email_unique
  on public.people(lower(email)) where email is not null;

alter table public.meetings add column if not exists area text not null default 'Cross-Business / AI';

create or replace function public.firefly_all_businesses()
returns text[]
language sql
immutable
as $$
  select array[
    'Mortgage','Medical','NP Franchise','Construction',
    'Lake House','Boba Tea','Cross-Business / AI'
  ]::text[];
$$;

-- Preserve access for the original owner account. The first existing Auth user
-- is linked to Billy only when no administrator has been configured yet.
do $$
declare
  owner_user auth.users%rowtype;
begin
  if not exists (select 1 from public.people where app_role = 'admin' and user_id is not null) then
    select * into owner_user from auth.users order by created_at asc limit 1;
    if owner_user.id is not null then
      update public.people
      set user_id = owner_user.id,
          email = owner_user.email,
          app_role = 'admin',
          business_access = public.firefly_all_businesses(),
          status = 'active',
          joined_at = coalesce(joined_at, now()),
          updated_at = now()
      where name = 'Billy';
    end if;
  end if;
end $$;

-- Link any existing Auth users whose full name already matches the roster.
update public.people p
set user_id = u.id,
    email = u.email,
    status = 'active',
    joined_at = coalesce(p.joined_at, u.created_at),
    business_access = case when cardinality(p.business_access) = 0 then public.firefly_all_businesses() else p.business_access end,
    updated_at = now()
from auth.users u
where p.user_id is null
  and nullif(u.raw_user_meta_data->>'full_name','') is not null
  and lower(p.name) = lower(u.raw_user_meta_data->>'full_name')
  and not exists (select 1 from public.people linked where linked.user_id = u.id);

-- Keep already-created accounts working after the access-control upgrade.
insert into public.people(name, role, email, user_id, app_role, business_access, status, joined_at)
select
  coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1) || ' ' || left(u.id::text,4)),
  'Team Member',
  u.email,
  u.id,
  'member',
  public.firefly_all_businesses(),
  'active',
  u.created_at
from auth.users u
where not exists (select 1 from public.people p where p.user_id = u.id)
on conflict do nothing;

create or replace function public.firefly_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.people
    where user_id = auth.uid() and active = true and status <> 'disabled' and app_role = 'admin'
  );
$$;

create or replace function public.firefly_can_access_business(requested_area text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.people
    where user_id = auth.uid()
      and active = true
      and status <> 'disabled'
      and (app_role = 'admin' or requested_area = any(business_access))
  );
$$;

create or replace function public.activate_current_member()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.people
  set status = 'active', joined_at = coalesce(joined_at, now()), updated_at = now()
  where user_id = auth.uid() and status in ('invited','active');
end;
$$;

create or replace function public.firefly_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  matched_id uuid;
begin
  update public.people
  set user_id = new.id,
      email = new.email,
      updated_at = now()
  where user_id is null and lower(email) = lower(new.email)
  returning id into matched_id;

  if matched_id is null then
    insert into public.people(name, role, email, user_id, app_role, business_access, status)
    values (
      coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1) || ' ' || left(new.id::text,4)),
      'Team Member', new.email, new.id, 'member', '{}', 'not_invited'
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists firefly_on_auth_user_created on auth.users;
create trigger firefly_on_auth_user_created
  after insert on auth.users
  for each row execute function public.firefly_handle_new_user();

create or replace function public.firefly_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists firefly_people_updated_at on public.people;
create trigger firefly_people_updated_at before update on public.people
  for each row execute function public.firefly_touch_updated_at();

-- Return only table-security flags; no row data is exposed.
create or replace function public.firefly_rls_status()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_object_agg(c.relname, c.relrowsecurity), '{}'::jsonb)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('people','tasks','loans','meetings');
$$;

revoke all on function public.firefly_is_admin() from public;
revoke all on function public.firefly_can_access_business(text) from public;
revoke all on function public.activate_current_member() from public;
revoke all on function public.firefly_rls_status() from public;
grant execute on function public.firefly_is_admin() to authenticated, service_role;
grant execute on function public.firefly_can_access_business(text) to authenticated, service_role;
grant execute on function public.activate_current_member() to authenticated;
grant execute on function public.firefly_rls_status() to service_role;

alter table public.people enable row level security;
alter table public.tasks enable row level security;
alter table public.loans enable row level security;
alter table public.meetings enable row level security;

drop policy if exists "authenticated manage people" on public.people;
drop policy if exists "authenticated manage tasks" on public.tasks;
drop policy if exists "authenticated manage loans" on public.loans;
drop policy if exists "authenticated manage meetings" on public.meetings;
drop policy if exists "team read people" on public.people;
drop policy if exists "admins manage people" on public.people;
drop policy if exists "business access read tasks" on public.tasks;
drop policy if exists "business access insert tasks" on public.tasks;
drop policy if exists "business access update tasks" on public.tasks;
drop policy if exists "business access delete tasks" on public.tasks;
drop policy if exists "mortgage access read loans" on public.loans;
drop policy if exists "mortgage access insert loans" on public.loans;
drop policy if exists "mortgage access update loans" on public.loans;
drop policy if exists "mortgage access delete loans" on public.loans;
drop policy if exists "business access read meetings" on public.meetings;
drop policy if exists "business access insert meetings" on public.meetings;
drop policy if exists "business access update meetings" on public.meetings;
drop policy if exists "business access delete meetings" on public.meetings;

create policy "team read people" on public.people
  for select to authenticated using ((active = true and status = 'active') or public.firefly_is_admin());
create policy "admins manage people" on public.people
  for all to authenticated using (public.firefly_is_admin()) with check (public.firefly_is_admin());

create policy "business access read tasks" on public.tasks
  for select to authenticated using (public.firefly_can_access_business(area));
create policy "business access insert tasks" on public.tasks
  for insert to authenticated with check (public.firefly_can_access_business(area));
create policy "business access update tasks" on public.tasks
  for update to authenticated using (public.firefly_can_access_business(area)) with check (public.firefly_can_access_business(area));
create policy "business access delete tasks" on public.tasks
  for delete to authenticated using (public.firefly_can_access_business(area));

create policy "mortgage access read loans" on public.loans
  for select to authenticated using (public.firefly_can_access_business('Mortgage'));
create policy "mortgage access insert loans" on public.loans
  for insert to authenticated with check (public.firefly_can_access_business('Mortgage'));
create policy "mortgage access update loans" on public.loans
  for update to authenticated using (public.firefly_can_access_business('Mortgage')) with check (public.firefly_can_access_business('Mortgage'));
create policy "mortgage access delete loans" on public.loans
  for delete to authenticated using (public.firefly_can_access_business('Mortgage'));

create policy "business access read meetings" on public.meetings
  for select to authenticated using (public.firefly_can_access_business(area));
create policy "business access insert meetings" on public.meetings
  for insert to authenticated with check (public.firefly_can_access_business(area));
create policy "business access update meetings" on public.meetings
  for update to authenticated using (public.firefly_can_access_business(area)) with check (public.firefly_can_access_business(area));
create policy "business access delete meetings" on public.meetings
  for delete to authenticated using (public.firefly_can_access_business(area));

select 'Firefly OS v0.3.0 Team Launch migration complete' as result;
