# Firefly OS v0.3.4 — Visible Task Notes Repair

This release makes task notes and updates unmistakably visible on the Master
Task Board and adds an on-screen version marker to confirm the deployed build.

## Included

- Dedicated **Notes & updates** column on every task.
- Visible **Notes & updates** button instead of the ambiguous Open button.
- Latest activity summary displayed in the task row.
- Task detail panel with team notes, author, and timestamp.
- Full task editing from the detail panel.
- Automatic history for title, company, owner, due date, priority, status, and
  task-detail changes.
- Read Only users can view activity; Editors and Developers can add notes and
  update tasks.
- Company-scoped access remains enforced.
- Sidebar displays **v0.3.4** so the production version is immediately verifiable.
- Recent task activity remains available to AI COO.

## Required deployment work

Run `supabase/v0.3.3-task-activity.sql` once before deploying this code. The SQL
is idempotent and is safe to run again if its prior status is uncertain. No new
Vercel environment variables are required. Follow `DEPLOYMENT.md`.
