# Firefly OS v0.3.3 Deployment

Complete these steps in order.

## 1. Run the Supabase migration

1. Open `supabase/v0.3.3-task-activity.sql` from this release.
2. In Supabase, open **SQL Editor → New query**.
3. Copy and paste the **entire SQL contents**. Do not paste only the filename.
4. Click **Run** once.
5. Confirm the result shows a number under `tasks_with_activity`.

The migration creates the task-activity table, access policies, automatic task
history, and a starting activity entry for existing tasks. It does not delete or
replace tasks, notes, companies, loans, meetings, profiles, or memberships.

For the current v0.3.2 deployment, run only the v0.3.3 migration. New projects
must run all migration files in version order.

## 2. Deploy the code

Upload the contents of this release folder to the root of the existing GitHub
repository and commit the changes. Vercel will build and deploy automatically.

No new Vercel environment variables are required. Keep the existing Supabase,
service-role, and OpenAI variables unchanged.

## 3. Verify

1. Sign in and open **Tasks**.
2. Click **Open** beside a task.
3. Add a test note and confirm your name and timestamp appear.
4. Change the owner, due date, priority, or status and save the task.
5. Confirm each changed field appears in the activity timeline.
6. Confirm a Read Only user can open and read the history but cannot add notes
   or edit the task.
7. Confirm a company-scoped user only sees activity for assigned companies.
