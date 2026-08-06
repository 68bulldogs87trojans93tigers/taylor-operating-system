# Changelog

## v0.3.0 — Team Launch

### Added

- Secure invitation endpoint backed by Supabase Auth Admin.
- Team-member roles: Administrator, Manager and Member.
- Per-person business-access assignments.
- Row-level access policies for tasks, meetings and mortgage loans.
- Team launch dashboard with invitation, workload and overdue metrics.
- Production-data verification for database access, authentication,
  invitation configuration, protected-table RLS and record counts.
- Automatic activation of invited members on first authenticated session.
- Invitation acceptance screen where each teammate creates their password.

### Changed

- Product branding changed from Taylor OS to Firefly OS.
- The Team page is now the central place for invitations, roles, permissions
  and team accountability.
- Existing authenticated users retain access during the migration.

### Security

- Updates Next.js from 14.2.5 to the patched 14.2.35 release without changing
  the application's major-version architecture.
- The service-role key is used only inside server routes.
- Existing broad authenticated-user policies are replaced with business-aware
  row-level security policies.
- Only active Administrators can invite people or change access.
- Public self-registration is removed from the Firefly OS interface.

### Compatibility

- No existing business records are deleted or renamed.
- The migration extends the existing `people` and `meetings` tables.
- Existing `tasks`, `loans`, `meetings` and Auth users are preserved.
