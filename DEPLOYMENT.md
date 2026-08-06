# Firefly OS v0.3.1 Deployment

Complete these steps in order.

## 1. Run the Supabase migration

1. Open `supabase/v0.3.1-developer-access.sql` from this release.
2. Copy the **entire SQL contents** into the Supabase SQL Editor. Do not paste
   only the filename.
3. Click **Run** once.
4. Review the result table and confirm Billy's login email shows role `admin`.

If Billy is not already an admin, replace the example email below with Billy's
actual Firefly OS login email and run it separately:

```sql
update public.workspace_members
set role = 'admin'
where user_id = (
  select id from public.profiles
  where lower(email) = lower('BILLY_LOGIN_EMAIL_HERE')
  limit 1
);
```

The migration adds access-control tables and policies. It does not delete or
rewrite existing tasks, loans, meetings, profiles, or workspaces.

## 2. Configure Supabase invitation redirects

In **Supabase → Authentication → URL Configuration**, add this redirect URL:

`https://YOUR-FIREFLY-DOMAIN/welcome`

Replace the example domain with the current Vercel production domain.

## 3. Configure Vercel

In **Vercel → Project → Settings → Environment Variables**, add:

- `SUPABASE_SERVICE_ROLE_KEY`: copy the service-role key from the existing
  Supabase project's API settings.

Apply it to Production and any Preview environments that should send invites.
Never put this key in GitHub or any `NEXT_PUBLIC_` variable.

Keep the existing Supabase and OpenAI variables unchanged.

## 4. Deploy the code

Upload the contents of this release folder to the root of the existing GitHub
repository and commit the changes. Vercel will build and deploy automatically.

## 5. Verify

1. Sign in as Billy and confirm **Developer** appears in the sidebar.
2. Open Developer and invite a test email with **Read Only** permission.
3. Accept the emailed invitation and create the test password.
4. Confirm the test user can navigate but cannot edit.
5. Change the test user to **Editor** and verify editing becomes available.
6. Revoke the test user and confirm access is removed.
