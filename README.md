# Firefly OS v0.3.1 — Developer Access

This release adds secure team invitations and role-based permissions to the
verified v0.3.0 AI COO release.

## Permission levels

- **Read Only** (`viewer`): can navigate and read assigned business areas but
  cannot create, edit, or delete operational records.
- **Editor** (`member`): can navigate and edit operational records in assigned
  business areas.
- **Developer** (`admin`): full access plus invitations, permission changes,
  business assignments, and access revocation.

## Included

- Developer-only sidebar link and protected `/developer` route.
- Secure Supabase email invitations and `/welcome` account setup.
- All-business or selected-business access controls.
- Team member permission editing and access revocation.
- Database-enforced read-only, editor, developer, and business-scope policies.
- Invite-only account creation in the Firefly OS interface.
- Existing sortable tasks and read-only AI COO functionality.

## Required deployment work

This release requires one controlled Supabase migration and the server-only
`SUPABASE_SERVICE_ROLE_KEY` Vercel variable. Follow `DEPLOYMENT.md` exactly.
