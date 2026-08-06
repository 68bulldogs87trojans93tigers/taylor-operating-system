# Firefly OS v0.3.0 Deployment

Follow this order to avoid interrupting the existing v0.2.1 application.

## 1. Create a restore point

In Supabase, open **Database → Backups** and confirm a current backup is
available before applying the migration.

## 2. Apply the database migration

1. Open the Firefly OS project in Supabase.
2. Open **SQL Editor**.
3. Paste and run `supabase/v0.3-team-launch.sql`.
4. Confirm the final result says the Team Launch migration completed.

The migration treats the earliest existing Supabase Auth user as the original
Billy/owner account when no Administrator is already configured. Before
continuing, verify the Billy row in **Table Editor → people** has:

- `app_role` = `admin`
- `status` = `active`
- `user_id` populated

## 3. Add the server-only Vercel variable

In Vercel, open **Project → Settings → Environment Variables** and add:

`SUPABASE_SERVICE_ROLE_KEY`

Use the Supabase service-role/secret key. Apply it to Production, Preview and
Development. Do not expose it in browser code and do not name it with a
`NEXT_PUBLIC_` prefix.

The existing public variables must remain configured:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 4. Configure invitation redirects

In Supabase, open **Authentication → URL Configuration**:

1. Set **Site URL** to the production Firefly OS address.
2. Add the production address followed by `/welcome` to **Redirect URLs**.
3. Add the Vercel preview pattern only if invitation testing is required in
   preview deployments.

In **Authentication → Providers → Email**, disable open user registration so
accounts are issued only through the Firefly OS Administrator invitation flow.

## 5. Deploy the application

Replace the existing GitHub repository contents with this release while
preserving the repository's own `.git` folder. Commit and push the changes.
Vercel will build and deploy automatically.

## 6. Verify production

1. Sign in as Billy.
2. Open **Team**.
3. Select **Verify production data**.
4. Confirm database, authentication, row-level security and invitation service
   all show as ready.
5. Invite one test teammate with access to only one business.
6. Sign in as the test teammate and verify they see that business's tasks but
   not restricted businesses.

## Rollback

If the application build fails, restore the previous Vercel deployment; do not
rerun or remove the migration. The v0.2.1 application can continue using the
extended tables. If access is unexpectedly restricted, use Supabase SQL Editor
to verify Billy's `user_id`, `app_role`, `status`, `active` and
`business_access` values before changing policies.
