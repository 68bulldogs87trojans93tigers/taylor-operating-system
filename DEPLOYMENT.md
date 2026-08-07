# Firefly OS v0.3.2 Deployment

Complete these steps in order.

## 1. Run the Supabase migration

1. Open `supabase/v0.3.2-company-manager.sql` from this release.
2. In Supabase, open **SQL Editor** and clear any previous text.
3. Copy and paste the **entire SQL contents**. Do not paste only the filename.
4. Click **Run** once.
5. Confirm the result lists the current Firefly companies.

This migration creates the company directory, seeds the existing companies,
adds access policies, and installs safe company renaming. It does not delete
tasks, loans, meetings, profiles, workspaces, memberships, or invitations.

If upgrading from v0.3.1, run only the v0.3.2 migration. New installations must
run the earlier migrations in version order before v0.3.2.

## 2. Deploy the code

Upload the contents of this release folder to the root of the existing GitHub
repository and commit the changes. Vercel will build and deploy automatically.

No new Vercel environment variables are required. Keep the existing Supabase,
service-role, and OpenAI variables unchanged.

## 3. Verify

1. Sign in with a Developer account and open **Developer**.
2. Add a temporary company with a name and description.
3. Confirm it appears in the sidebar, Business Workspaces, New Task form, and
   company-access options for team members.
4. Create a task for it and confirm the task appears in that company's workspace.
5. Edit the company description, then archive and restore the company.
6. Delete the temporary task if desired. Companies are archived rather than
   deleted so historical task data remains intact.
