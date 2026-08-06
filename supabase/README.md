# Supabase

No SQL changes are required for v0.2.2.

This release was corrected to use the live Supabase schema:

- `tasks.workspace_id`
- `tasks.business`
- `loans.borrower`
- `meetings.transcript`
- `workspace_members`
- `workspace_member_directory`

Do not run the earlier v0.3 or v0.3.1 migration files. The existing database
records and workspace relationships are already correct.
