# Supabase — v0.3.1

Run `v0.3.1-developer-access.sql` once before deploying the application.

The migration adds invitation tracking, optional business-level access, and
restrictive security policies. It does not delete or rewrite existing tasks,
loans, meetings, profiles, workspaces, or membership records.

The final query lists the current membership roles. Confirm that Billy's row
shows `admin`; that is the database role displayed as **Developer** in Firefly OS.
