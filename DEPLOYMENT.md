# Firefly OS v0.3.4 Deployment

Complete these steps in order.

## 1. Run the Supabase migration

1. Open Supabase **SQL Editor → New query**.
2. Copy the entire contents of `supabase/v0.3.3-task-activity.sql` into the editor.
3. Click **Run** once.
4. Confirm the result shows a number under `tasks_with_activity`.

The migration is idempotent and safe to run again. It creates task activity,
secure access policies, automatic history, and starting entries for existing
tasks. It does not delete existing data.

## 2. Deploy the code

Upload this release's contents to the root of the existing GitHub repository and
commit the changes. Vercel should deploy from the production branch.

No new environment variables are required.

## 3. Verify

1. Refresh Firefly OS and confirm the sidebar says **v0.3.4**.
2. Open **Tasks** and confirm the **Notes & updates** column is visible.
3. Click **Notes & updates**, add a test note, and confirm the author and time.
4. Change a task field and confirm it appears in the activity timeline.
5. Confirm Read Only users can view but cannot post or edit.
