# Supabase — Firefly OS v0.3.4

Run `v0.3.3-task-activity.sql` once before deploying v0.3.4. It is idempotent
and safe to run again when the prior migration status is uncertain.

The migration adds task notes, automatic change history, indexes, and role- and
company-aware Row Level Security. Existing tasks receive a starting activity
entry; no existing operational or authentication data is deleted.

The final result should show a count under `tasks_with_activity`. New
installations must run the SQL migrations in version order.
