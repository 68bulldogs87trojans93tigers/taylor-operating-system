# Changelog

## v0.3.2 — Developer Company Manager

- Added company creation to the Developer screen.
- Added company name and description editing.
- Added archive and restore controls for user-created companies.
- Made sidebar links, Business Workspaces, task creation, and invitation access
  use the live company directory.
- Added database-safe company renaming that preserves existing tasks and member
  access assignments.
- Kept Firefly Mortgage and Cross-Business / AI as protected system companies.
- Added a timestamp compatibility repair for earlier v0.3.1 installations.
- Preserved role permissions, AI COO, sortable tasks, meetings, and pipeline.

## v0.3.1 — Developer Invitations and Permissions

- Added secure invitations, Read Only, Editor, and Developer roles.
- Added all-company and selected-company access.
- Added permission editing and access revocation.
- Enforced access with Supabase Row Level Security.
