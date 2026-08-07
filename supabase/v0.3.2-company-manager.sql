-- Firefly OS v0.3.2 — Developer Company Manager
-- Run this entire file once in the Supabase SQL Editor before deploying v0.3.2.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- Safe to run even if v0.3.1 was installed before its timestamp compatibility
-- repair was added.
alter table if exists public.workspace_member_business_access
  add column if not exists updated_at timestamptz not null default now();

insert into public.businesses (workspace_id, name, description, is_system, sort_order)
select w.id, seed.name, seed.description, seed.is_system, seed.sort_order
from public.workspaces w
cross join (values
  ('Firefly Mortgage', 'Close loans, prove operations and scale production.', true, 1),
  ('Medical', 'Consolidate facilities and evaluate Hazel Green clinic.', false, 2),
  ('NP Franchise', 'Launch, measure demand and build franchise support.', false, 3),
  ('Construction', 'Launch pipeline, first homes and subdivision analysis.', false, 4),
  ('Lake House', 'Protect revenue, manage repairs and prepare manager transition.', false, 5),
  ('Boba Tea', 'Improve P&L, traffic and operating accountability.', false, 6),
  ('Cross-Business / AI', 'Websites, dashboards, meeting intelligence and automation.', true, 7)
) as seed(name, description, is_system, sort_order)
on conflict (workspace_id, name) do update
set description = excluded.description,
    is_system = excluded.is_system,
    sort_order = excluded.sort_order,
    updated_at = now();

alter table public.businesses enable row level security;

drop policy if exists "v032_businesses_workspace_read" on public.businesses;
create policy "v032_businesses_workspace_read"
on public.businesses for select to authenticated
using (public.firefly_has_business_access(workspace_id, name));

drop policy if exists "v032_businesses_developer_insert" on public.businesses;
create policy "v032_businesses_developer_insert"
on public.businesses for insert to authenticated
with check (public.firefly_is_developer(workspace_id));

drop policy if exists "v032_businesses_developer_update" on public.businesses;
create policy "v032_businesses_developer_update"
on public.businesses for update to authenticated
using (public.firefly_is_developer(workspace_id))
with check (public.firefly_is_developer(workspace_id));

grant select on public.businesses to authenticated;

create or replace function public.firefly_rename_business(target_business_id uuid, new_business_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_business public.businesses%rowtype;
  cleaned_name text;
begin
  cleaned_name := trim(regexp_replace(new_business_name, '\s+', ' ', 'g'));
  if cleaned_name = '' or length(cleaned_name) > 100 then
    raise exception 'Enter a valid company name.';
  end if;

  select * into current_business
  from public.businesses
  where id = target_business_id;

  if current_business.id is null then
    raise exception 'Company not found.';
  end if;
  if not public.firefly_is_developer(current_business.workspace_id) then
    raise exception 'Developer permission is required.';
  end if;
  if current_business.is_system and current_business.name <> cleaned_name then
    raise exception 'System company names cannot be changed.';
  end if;

  update public.tasks
  set business = cleaned_name,
      updated_at = now(),
      updated_by = auth.uid()
  where workspace_id = current_business.workspace_id
    and business = current_business.name;

  update public.workspace_member_business_access
  set business = cleaned_name,
      updated_at = now()
  where workspace_id = current_business.workspace_id
    and business = current_business.name;

  update public.businesses
  set name = cleaned_name,
      updated_at = now()
  where id = target_business_id;
end;
$$;

revoke all on function public.firefly_rename_business(uuid, text) from public;
grant execute on function public.firefly_rename_business(uuid, text) to authenticated;

notify pgrst, 'reload schema';

select name, is_active, is_system
from public.businesses
order by sort_order, name;
