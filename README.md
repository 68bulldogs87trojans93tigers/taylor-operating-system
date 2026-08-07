# Firefly OS v0.3.2 — Company Manager

This release lets Developers create and manage companies without changing the
code or running additional SQL for each company.

## Included

- Developer-only **Add company** form.
- Company name and description editing.
- Archive and restore controls for user-created companies.
- Automatic company lists in the sidebar, Business Workspaces, New Task form,
  and team invitation permissions.
- Safe company renaming that updates existing task and member-access records.
- Workspace and company-level access enforced by Supabase Row Level Security.
- Preserved v0.3.1 Read Only, Editor, and Developer roles.
- Preserved sortable tasks, AI COO, meeting capture, and mortgage pipeline.

## Required deployment work

Run `supabase/v0.3.2-company-manager.sql` once, then deploy the application code.
No new Vercel environment variables are required. See `DEPLOYMENT.md`.
