-- Taylor Operating System v1.0
-- Run this complete script once in Supabase SQL Editor.
-- A successful setup creates the tables listed at the end of this file.

begin;

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  business text not null,
  owner text not null,
  due_date date,
  priority text not null default 'High' check (priority in ('Critical','High','Medium','Low')),
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Blocked','Complete')),
  why text,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  borrower text not null,
  amount numeric(14,2) not null default 0,
  product text,
  owner text,
  stage text,
  expected_close date,
  next_step text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  meeting_date date not null default current_date,
  transcript text,
  summary text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business text not null,
  decision text not null,
  owner text,
  decision_date date not null default current_date,
  rationale text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists tasks_workspace_idx on public.tasks(workspace_id);
create index if not exists tasks_owner_idx on public.tasks(owner);
create index if not exists tasks_due_idx on public.tasks(due_date);
create index if not exists loans_workspace_idx on public.loans(workspace_id);
create index if not exists meetings_workspace_idx on public.meetings(workspace_id);
create index if not exists members_user_idx on public.workspace_members(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at before update on public.meetings
for each row execute function public.set_updated_at();

insert into public.workspaces (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Taylor Operating System')
on conflict (id) do update set name=excluded.name;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  if exists (
    select 1 from public.workspace_members
    where workspace_id = '11111111-1111-1111-1111-111111111111'
  ) then
    assigned_role := 'member';
  else
    assigned_role := 'admin';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values ('11111111-1111-1111-1111-111111111111', new.id, assigned_role)
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(target_workspace uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.workspace_members
  where workspace_id = target_workspace
    and user_id = auth.uid()
  limit 1;
$$;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tasks enable row level security;
alter table public.loans enable row level security;
alter table public.meetings enable row level security;
alter table public.decisions enable row level security;

-- Re-running the script is safe.
drop policy if exists "members view workspace" on public.workspaces;
drop policy if exists "members view profiles" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "members view members" on public.workspace_members;
drop policy if exists "members view tasks" on public.tasks;
drop policy if exists "members add tasks" on public.tasks;
drop policy if exists "members update tasks" on public.tasks;
drop policy if exists "members delete tasks" on public.tasks;
drop policy if exists "members view loans" on public.loans;
drop policy if exists "members add loans" on public.loans;
drop policy if exists "members update loans" on public.loans;
drop policy if exists "members delete loans" on public.loans;
drop policy if exists "members view meetings" on public.meetings;
drop policy if exists "members add meetings" on public.meetings;
drop policy if exists "members update meetings" on public.meetings;
drop policy if exists "members delete meetings" on public.meetings;
drop policy if exists "members view decisions" on public.decisions;
drop policy if exists "members add decisions" on public.decisions;
drop policy if exists "members update decisions" on public.decisions;
drop policy if exists "members delete decisions" on public.decisions;

create policy "members view workspace"
on public.workspaces for select to authenticated
using (public.is_workspace_member(id));

create policy "members view profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on mine.workspace_id = theirs.workspace_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

create policy "users update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "members view members"
on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "members view tasks" on public.tasks for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add tasks" on public.tasks for insert to authenticated with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members update tasks" on public.tasks for update to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer') with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members delete tasks" on public.tasks for delete to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) = 'admin');

create policy "members view loans" on public.loans for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add loans" on public.loans for insert to authenticated with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members update loans" on public.loans for update to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer') with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members delete loans" on public.loans for delete to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) = 'admin');

create policy "members view meetings" on public.meetings for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add meetings" on public.meetings for insert to authenticated with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members update meetings" on public.meetings for update to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer') with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members delete meetings" on public.meetings for delete to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) = 'admin');

create policy "members view decisions" on public.decisions for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add decisions" on public.decisions for insert to authenticated with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members update decisions" on public.decisions for update to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer') with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'viewer');
create policy "members delete decisions" on public.decisions for delete to authenticated using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) = 'admin');

-- Seed data: inserts only when the workspace has no tasks or loans.
insert into public.tasks (workspace_id, title, business, owner, due_date, priority, status, why)
select * from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Freeze concrete demolition and excavation', 'Lake House', 'Jimmy', current_date + 1, 'Critical', 'In Progress', 'Avoid unnecessary repair costs'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Independent pool leak-detection opinion', 'Lake House', 'Billy', current_date + 4, 'High', 'Not Started', 'Confirm source before excavation'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Close Baylee loan ($150,000)', 'Firefly Mortgage', 'Jimmy', current_date + 8, 'Critical', 'In Progress', 'Immediate revenue'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Close Laura Lee DSCR ($750,000)', 'Firefly Mortgage', 'Jimmy', current_date + 15, 'Critical', 'In Progress', 'Immediate revenue'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Close Lake House refinance ($3,500,000)', 'Firefly Mortgage', 'Jimmy', current_date + 25, 'Critical', 'Not Started', 'Largest near-term opportunity'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Close Daddy''s reverse mortgage ($350,000)', 'Firefly Mortgage', 'Jimmy', current_date + 25, 'High', 'Not Started', 'Complete current pipeline'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Complete UWM broker and processing training', 'Firefly Mortgage', 'Jimmy', current_date + 8, 'Critical', 'Not Started', 'Build repeatable closing process'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Verify licensing, NMLS and investor access', 'Firefly Mortgage', 'Nam', current_date + 4, 'Critical', 'In Progress', 'Operational readiness'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Schedule Albertville multispecialty facility visit', 'Medical', 'Billy', current_date + 8, 'High', 'Not Started', 'Benchmark combined facility'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Prepare combined facility construction budget', 'Medical', 'Jamie', current_date + 30, 'High', 'Not Started', 'Test feasibility'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Launch franchise marketing', 'NP Franchise', 'Laralee', current_date + 4, 'Critical', 'In Progress', 'Validate market demand'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Complete construction website and portfolio', 'Construction', 'Lateef', current_date + 8, 'High', 'In Progress', 'Generate leads'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Identify first three construction starts', 'Construction', 'Jamie', current_date + 8, 'High', 'Not Started', 'Create near-term revenue'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Produce Boba Tea P&L and break-even', 'Boba Tea', 'Nam', current_date + 8, 'High', 'Not Started', 'Know financial position')
) as seed(workspace_id,title,business,owner,due_date,priority,status,why)
where not exists (select 1 from public.tasks where workspace_id='11111111-1111-1111-1111-111111111111');

insert into public.loans (workspace_id, borrower, amount, product, owner, stage, next_step)
select * from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Baylee', 150000::numeric, 'Confirm purchase/refi', 'Jimmy', 'File review', 'Complete file review and submit'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Laura Lee', 750000::numeric, 'DSCR', 'Jimmy / John Kendall', 'Structuring', 'Confirm structure, payoff and investor'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Lake House', 3500000::numeric, 'Refinance', 'Jimmy / Billy', 'Investor selection', 'Select investor and complete property package'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Daddy''s Reverse', 350000::numeric, 'Reverse mortgage', 'Jimmy / Billy', 'Eligibility', 'Confirm eligibility, counseling and appraisal')
) as seed(workspace_id,borrower,amount,product,owner,stage,next_step)
where not exists (select 1 from public.loans where workspace_id='11111111-1111-1111-1111-111111111111');

-- Enable real-time updates for shared tables. Ignore duplicate-table errors on reruns.
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.loans;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.meetings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.decisions;
exception when duplicate_object then null;
end $$;

commit;

-- This result confirms the setup and should return seven rows.
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('workspaces','profiles','workspace_members','tasks','loans','meetings','decisions')
order by table_name;
