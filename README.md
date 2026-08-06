# Firefly OS v0.2.2 — Live Schema Correction

This hotfix aligns the Next.js application with the existing production
Supabase workspace schema.

## Fixed

- Business pages now filter `tasks.business` instead of the nonexistent
  `tasks.area` field.
- All reads and new records use the signed-in user's `workspace_id`.
- Firefly Mortgage matches the exact production business label.
- Loan views use `borrower` and the live loan fields.
- Meetings use `transcript` and create workspace-linked tasks.
- Team accountability reads `workspace_member_directory`.
- Task status options match the production database constraint.
- Next.js is updated to the patched 14.2.35 release.

## Deployment

No Supabase SQL is required. Upload the contents of this folder to the root of
the existing GitHub repository. Vercel will rebuild automatically.

After deployment, open Businesses and verify that each business card and
workspace displays its assigned tasks.
