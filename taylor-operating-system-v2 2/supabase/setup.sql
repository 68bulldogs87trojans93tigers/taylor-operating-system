create extension if not exists pgcrypto;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  business text not null,
  title text not null,
  why text,
  owner text not null,
  due_date date,
  priority text not null default 'Medium',
  status text not null default 'Open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount numeric not null,
  product text,
  owner text,
  next_step text,
  status text not null default 'Open',
  expected_close date,
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;
alter table public.tasks enable row level security;
alter table public.loans enable row level security;

drop policy if exists "authenticated read people" on public.people;
create policy "authenticated read people" on public.people for select to authenticated using (true);
drop policy if exists "authenticated manage people" on public.people;
create policy "authenticated manage people" on public.people for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read tasks" on public.tasks;
create policy "authenticated read tasks" on public.tasks for select to authenticated using (true);
drop policy if exists "authenticated manage tasks" on public.tasks;
create policy "authenticated manage tasks" on public.tasks for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read loans" on public.loans;
create policy "authenticated read loans" on public.loans for select to authenticated using (true);
drop policy if exists "authenticated manage loans" on public.loans;
create policy "authenticated manage loans" on public.loans for all to authenticated using (true) with check (true);

insert into public.people (name, role) values
('Billy','CEO'),('Nam','Operations'),('Jimmy','Mortgage Operations'),('Laralee','Medical / Franchise'),('Jamie','Construction'),('Lateef','Web / Marketing'),('John Kendall','Mortgage')
on conflict (name) do update set role = excluded.role;

insert into public.loans (name, amount, product, owner, next_step, status) values
('Baylee',150000,'Confirm purchase/refi','Jimmy','Complete file review and submit','Open'),
('Laura Lee',750000,'DSCR','Jimmy / John Kendall','Confirm structure, payoff and investor','Open'),
('Lake House',3500000,'Refinance','Jimmy / Billy','Select investor; complete property package','Open'),
('Daddy''s Reverse',350000,'Reverse mortgage','Jimmy / Billy','Confirm eligibility, counseling and appraisal','Open')
on conflict (name) do update set amount=excluded.amount, product=excluded.product, owner=excluded.owner, next_step=excluded.next_step;

insert into public.tasks (business,title,why,owner,due_date,priority,status) values
('Lake House','Freeze excavation and obtain written scope','Avoid unnecessary repair cost','Jimmy',current_date,'Critical','Open'),
('Lake House','Obtain independent pool leak opinion','Protect revenue and avoid excavation','Billy',current_date + 7,'High','Open'),
('Firefly Mortgage','Advance Baylee loan','Generate near-term revenue','Jimmy',current_date + 7,'Critical','Open'),
('Firefly Mortgage','Advance Laura Lee DSCR','Generate near-term revenue','Jimmy',current_date + 7,'Critical','Open'),
('Firefly Mortgage','Advance Lake House refinance','Largest immediate opportunity','Jimmy',current_date + 14,'Critical','Open'),
('Firefly Mortgage','Advance Daddy reverse mortgage','Complete current pipeline','Jimmy',current_date + 14,'High','Open'),
('Firefly Mortgage','Complete UWM processing training','Build repeatable broker process','Jimmy',current_date + 7,'High','Open'),
('Medical','Schedule Albertville facility visit','Benchmark combined facility','Billy',current_date + 14,'High','Open'),
('NP Franchise','Launch franchise marketing','Test market demand','Laralee',current_date + 7,'High','Open'),
('Boba Tea','Complete P&L and assign operating owner','Improve existing performance','Nam',current_date + 7,'High','Open'),
('Construction','Finish construction website','Create lead flow','Lateef',current_date + 7,'High','Open'),
('Construction','Identify first three home starts','Create near-term revenue','Jamie',current_date + 7,'High','Open')
on conflict do nothing;

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.people;
