create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  title text not null,
  owner text not null,
  due_date date,
  status text not null default 'Open' check (status in ('Open','In Progress','Blocked','Complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount numeric(14,2) not null,
  product text,
  owner text,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.loans enable row level security;

drop policy if exists "authenticated users manage tasks" on public.tasks;
create policy "authenticated users manage tasks" on public.tasks for all to authenticated using (true) with check (true);

drop policy if exists "authenticated users manage loans" on public.loans;
create policy "authenticated users manage loans" on public.loans for all to authenticated using (true) with check (true);

insert into public.loans (name, amount, product, owner, status) values
('Baylee',150000,'Confirm purchase/refi','Jimmy','Open'),
('Laura Lee',750000,'DSCR','Jimmy / John Kendall','Open'),
('Lake House',3500000,'Refinance','Jimmy / Billy','Open'),
('Daddy''s Reverse',350000,'Reverse mortgage','Jimmy / Billy','Open')
on conflict (name) do update set amount=excluded.amount, product=excluded.product, owner=excluded.owner;

insert into public.tasks (area,title,owner,due_date,status)
select * from (values
('Lake House','Freeze excavation and obtain independent leak opinion','Billy / Jimmy',current_date + 7,'Open'),
('Mortgage','Advance all four named loans','Jimmy',current_date + 7,'In Progress'),
('Mortgage','Complete UWM broker/processing training','Jimmy / Nam',current_date + 7,'Open'),
('Medical','Schedule Albertville facility visit','Billy / Jamie',current_date + 14,'Open'),
('NP Franchise','Launch and track leads daily','Billy / Laralee',current_date + 10,'Open'),
('Boba Tea','Complete P&L and assign operating owner','Nam',current_date + 7,'Open'),
('Construction','Finish website and choose first home start','Billy / Jamie / Lateef',current_date + 7,'Open')
) as seed(area,title,owner,due_date,status)
where not exists (select 1 from public.tasks);
