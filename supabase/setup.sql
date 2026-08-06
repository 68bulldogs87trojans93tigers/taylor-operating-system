create extension if not exists pgcrypto;

create table if not exists public.people (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 role text,
 email text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 area text not null,
 title text not null,
 owner text not null,
 due_date date,
 priority text not null default 'High' check(priority in ('Critical','High','Medium','Low')),
 status text not null default 'Open' check(status in ('Open','In Progress','Blocked','Complete')),
 why text,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.loans (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 amount numeric(14,2) not null,
 product text,
 owner text,
 stage text not null default 'Application',
 expected_close date,
 expected_revenue numeric(12,2) default 8000,
 next_step text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 notes text not null,
 summary text,
 created_at timestamptz not null default now()
);

-- Upgrade earlier Taylor OS schemas without deleting existing data.
alter table public.tasks add column if not exists priority text not null default 'High';
alter table public.tasks add column if not exists why text;
alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.loans add column if not exists stage text not null default 'Application';
alter table public.loans add column if not exists expected_close date;
alter table public.loans add column if not exists expected_revenue numeric(12,2) default 8000;
alter table public.loans add column if not exists next_step text;
alter table public.loans add column if not exists updated_at timestamptz not null default now();

alter table public.people enable row level security;
alter table public.tasks enable row level security;
alter table public.loans enable row level security;
alter table public.meetings enable row level security;

do $$ begin
 create policy "authenticated manage people" on public.people for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy "authenticated manage tasks" on public.tasks for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy "authenticated manage loans" on public.loans for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy "authenticated manage meetings" on public.meetings for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

insert into public.people(name,role) values
('Billy','CEO / Administrator'),('Nam','Operations'),('Jimmy','Mortgage Operations'),('Laralee','Medical / Franchise'),('Jamie','Construction'),('Lateef','Web / Marketing'),('John Kendall','Mortgage')
on conflict(name) do update set role=excluded.role;

insert into public.loans(name,amount,product,owner,stage,next_step) values
('Baylee',150000,'Confirm purchase/refi','Jimmy','Processing','Complete file review and submit'),
('Laura Lee',750000,'DSCR','Jimmy / John Kendall','Application','Confirm structure, payoff and investor'),
('Lake House',3500000,'Refinance','Jimmy / Billy','Application','Select investor; complete property package'),
('Daddy''s Reverse',350000,'Reverse mortgage','Jimmy / Billy','Application','Confirm eligibility, counseling and appraisal')
on conflict(name) do update set amount=excluded.amount,product=excluded.product,owner=excluded.owner,next_step=excluded.next_step;

insert into public.tasks(area,title,owner,due_date,priority,status,why,notes)
select * from (values
('Lake House','Freeze excavation and obtain written contractor scope','Jimmy',current_date+1,'Critical','Open','Avoid unnecessary concrete demolition','Get estimate, test results, line-location method, photos and responsibility position.'),
('Lake House','Obtain independent pool leak-detection opinion','Billy',current_date+7,'High','Open','Verify repair before excavation','Test bottom drain, skimmers and lines.'),
('Lake House','Build reserve before replacing managers','Billy',current_date+60,'Medium','In Progress','Protect rental income during transition','Continue close oversight of current managers.'),
('Mortgage','Advance Baylee loan ($150,000)','Jimmy',current_date+7,'Critical','In Progress','Immediate revenue','Complete file review and submit.'),
('Mortgage','Advance Laura Lee DSCR ($750,000)','Jimmy / John Kendall',current_date+7,'Critical','Open','Immediate revenue','Confirm structure, payoff and investor.'),
('Mortgage','Advance Lake House refinance ($3,500,000)','Jimmy / Billy',current_date+7,'Critical','Open','Largest immediate opportunity','Select investor and complete property package.'),
('Mortgage','Advance Daddy reverse mortgage ($350,000)','Jimmy / Billy',current_date+7,'High','Open','Complete current pipeline','Confirm eligibility, counseling and appraisal.'),
('Mortgage','Complete UWM broker/processing training','Jimmy / Nam',current_date+7,'High','Open','Create repeatable closing process','Document application through funding.'),
('Mortgage','Confirm licensing, NMLS and investor access','Nam',current_date+7,'High','Open','Operational readiness','Confirm UWM, PennyMac and Rocket Pro.'),
('Medical','Confirm occupancy costs, payoff and property value','Laralee / Accounting',current_date+7,'High','Open','Establish combined-facility baseline','Include both locations.'),
('Medical','Schedule Albertville multispecialty facility visit','Billy / Jamie',current_date+14,'High','Open','Benchmark layout and economics','Document tenants, shared services and design.'),
('Medical','Evaluate Hazel Green / Greenbrier sites','Billy / Jamie',current_date+30,'High','Open','Select combined facility location','Include Steiger’s Curve and Charlie Rogers property.'),
('Medical','Compare Hazel Green clinic locations','Billy / Laralee',current_date+30,'High','Open','Evaluate Suboxone and men’s health opportunity','Verify compliance and break-even volume.'),
('NP Franchise','Confirm FDD and marketing are launch-ready','Laralee / Franchise counsel',current_date+5,'Critical','Open','Prepare legal launch','Confirm all materials.'),
('NP Franchise','Finish website, forms and CRM routing','Lateef / Marketing',current_date+7,'High','Open','Capture and respond to leads','Test all forms.'),
('NP Franchise','Launch and track leads daily','Billy / Laralee',current_date+10,'High','Open','Validate market demand','Review at day 7 and day 10.'),
('Boba Tea','Produce P&L, break-even and weekly scorecard','Nam / Accounting',current_date+7,'High','Open','Know actual performance','Include sales, labor, product cost and waste.'),
('Boba Tea','Assign daily operating owner','Billy / Nam',current_date+7,'High','Open','Create accountability','One person owns daily performance.'),
('Construction','Complete website and project portfolio','Lateef / Jamie',current_date+7,'High','Open','Generate construction leads','Include homes, subdivisions, plans and testimonials.'),
('Construction','Identify first three homes and start requirements','Jamie / Billy',current_date+7,'Critical','Open','Start near-term production','List plans, permits, financing and schedule.'),
('Construction','Contact Calvin and Danny about framing capacity','Billy / Jamie',current_date+7,'High','Open','Confirm production capacity','Obtain pricing and availability.'),
('Cross-Business / AI','Create weekly operating dashboard','Nam',current_date+7,'High','Open','Centralize accountability','Track owners, deadlines, blockers and results.')
) as seed(area,title,owner,due_date,priority,status,why,notes)
where not exists(select 1 from public.tasks);

select 'Taylor Operating System setup complete' as result,
 (select count(*) from public.tasks) as tasks,
 (select count(*) from public.loans) as loans,
 (select count(*) from public.people) as people;
