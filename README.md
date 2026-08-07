# Firefly OS v0.3.3 — Task Notes & Activity

This release gives every accessible task a shared detail panel, team notes, and
an automatic history of important changes.

## Included

- One-click **Open** action on the Master Task Board.
- Full task editing inside the detail panel.
- Team notes with author and timestamp.
- Automatic history for task name, business, owner, due date, priority, status,
  and task-detail changes.
- Latest task update shown directly on the Master Task Board.
- Task links from Business Workspaces and Team Accountability.
- Read Only users can view activity; Editors and Developers can add notes and
  update tasks.
- Company-scoped access is enforced for both tasks and their activity.
- Recent task notes and changes are included in the AI COO operating snapshot.
- Preserved v0.3.2 company management and all previous Firefly OS features.

## Required deployment work

Run `supabase/v0.3.3-task-activity.sql` once, then deploy the application code.
No new Vercel environment variables are required. Follow `DEPLOYMENT.md`.
