-- Firefly OS v0.3.4 — Task Notes & Activity
-- Run this entire file once before deploying v0.3.4.

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  activity_type text not null check (activity_type in ('note', 'change')),
  message text not null check (length(trim(message)) between 1 and 2000),
  field_name text,
  old_value text,
  new_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_activity_task_created_idx
  on public.task_activity (task_id, created_at desc);

create index if not exists task_activity_workspace_created_idx
  on public.task_activity (workspace_id, created_at desc);

create index if not exists task_activity_created_by_idx
  on public.task_activity (created_by);

alter table public.task_activity enable row level security;

create or replace function public.firefly_has_task_access(
  target_task uuid,
  target_workspace uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task
      and t.workspace_id = target_workspace
      and public.firefly_has_business_access(t.workspace_id, t.business)
  )
$$;

revoke all on function public.firefly_has_task_access(uuid, uuid) from public;
revoke execute on function public.firefly_has_task_access(uuid, uuid) from anon;
grant execute on function public.firefly_has_task_access(uuid, uuid) to authenticated;

drop policy if exists "v033_task_activity_read" on public.task_activity;
create policy "v033_task_activity_read"
on public.task_activity for select to authenticated
using (public.firefly_has_task_access(task_id, workspace_id));

drop policy if exists "v033_task_activity_add_note" on public.task_activity;
create policy "v033_task_activity_add_note"
on public.task_activity for insert to authenticated
with check (
  activity_type = 'note'
  and created_by = (select auth.uid())
  and field_name is null
  and old_value is null
  and new_value is null
  and public.firefly_can_edit(workspace_id)
  and public.firefly_has_task_access(task_id, workspace_id)
);

grant select, insert on public.task_activity to authenticated;

create or replace function public.firefly_log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
begin
  actor := coalesce(auth.uid(), new.updated_by, new.created_by);

  if tg_op = 'INSERT' then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Task created.', actor);
    return new;
  end if;

  if old.title is distinct from new.title then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Task name changed.', 'title', old.title, new.title, actor);
  end if;

  if old.business is distinct from new.business then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Business changed.', 'business', old.business, new.business, actor);
  end if;

  if old.owner is distinct from new.owner then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Owner changed.', 'owner', old.owner, new.owner, actor);
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Due date changed.', 'due_date', coalesce(old.due_date::text, 'TBD'), coalesce(new.due_date::text, 'TBD'), actor);
  end if;

  if old.priority is distinct from new.priority then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Priority changed.', 'priority', old.priority, new.priority, actor);
  end if;

  if old.status is distinct from new.status then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Status changed.', 'status', old.status, new.status, actor);
  end if;

  if old.why is distinct from new.why then
    insert into public.task_activity
      (workspace_id, task_id, activity_type, message, field_name, old_value, new_value, created_by)
    values
      (new.workspace_id, new.id, 'change', 'Task details changed.', 'why', old.why, new.why, actor);
  end if;

  return new;
end;
$$;

revoke all on function public.firefly_log_task_activity() from public;
revoke execute on function public.firefly_log_task_activity() from anon, authenticated;

drop trigger if exists firefly_task_activity_trigger on public.tasks;
create trigger firefly_task_activity_trigger
after insert or update on public.tasks
for each row execute function public.firefly_log_task_activity();

insert into public.task_activity
  (workspace_id, task_id, activity_type, message, created_by, created_at)
select
  t.workspace_id,
  t.id,
  'change',
  'Task activity tracking started.',
  coalesce(t.updated_by, t.created_by),
  coalesce(t.updated_at, t.created_at, now())
from public.tasks t
where not exists (
  select 1 from public.task_activity a where a.task_id = t.id
);

notify pgrst, 'reload schema';

select count(*) as tasks_with_activity
from public.task_activity;
