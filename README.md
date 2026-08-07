# Firefly OS v0.3.5 — Unmissable Notes & Updates

This release keeps Notes & Updates in the first task column, where it remains
visible without horizontal scrolling, and adds a dedicated page banner.

## Included

- **Tasks & Notes** in the main navigation.
- Dedicated **Notes & Updates** banner above the task board.
- **Open Notes & Updates** button directly beneath every task name.
- Latest activity summary displayed in the task row.
- Task detail panel with team notes, author, and timestamp.
- Full task editing from the detail panel.
- Automatic history for title, company, owner, due date, priority, status, and
  task-detail changes.
- Read Only users can view activity; Editors and Developers can add notes and
  update tasks.
- Company-scoped access remains enforced.
- Sidebar displays **v0.3.5** so the production version is immediately verifiable.
- Recent task activity remains available to AI COO.

## Required deployment work

Run `supabase/v0.3.3-task-activity.sql` once before deploying this code. The SQL
is idempotent and is safe to run again if its prior status is uncertain. No new
Vercel environment variables are required. Follow `DEPLOYMENT.md`.
