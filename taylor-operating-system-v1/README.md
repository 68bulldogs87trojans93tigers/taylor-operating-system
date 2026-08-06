# Taylor Operating System v1.0

A shared cloud project-management system for Firefly Mortgage, Medical, NP Franchise, Construction, Boba Tea, and the Lake House.

## What is included

- Email/password authentication
- Shared Supabase database
- First confirmed user becomes administrator
- Real-time task, mortgage, and meeting updates
- Executive dashboard
- Master task list
- Firefly Mortgage pipeline seeded at $4.75 million
- Meeting notes that create action items
- AI COO-style morning and weekly briefings
- JSON export
- Vercel-ready static deployment

## Step 1 — Create the database

1. Open your Supabase project.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open `supabase/setup.sql` from this project.
5. Copy the complete file into the SQL Editor.
6. Select **Run**.
7. The final query should return these tables: `decisions`, `loans`, `meetings`, `profiles`, `tasks`, `workspace_members`, and `workspaces`.
8. Open **Table Editor** and use the refresh button if the tables do not immediately appear.

The script is safe to run again. It will not duplicate the seed tasks or loans when they already exist.

## Step 2 — Configure authentication

In Supabase:

1. Go to **Authentication → Providers → Email**.
2. Confirm email/password signups are enabled.
3. During testing, either keep email confirmation enabled and confirm the email, or temporarily disable email confirmation.
4. After Vercel deployment, go to **Authentication → URL Configuration**.
5. Set the Site URL to your Vercel URL.
6. Add the Vercel URL to Redirect URLs.

## Step 3 — Test locally

Do not open `index.html` using a `file://` address. Run a local web server.

Mac or Windows with Python installed:

```bash
cd taylor-operating-system-v1
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Select **Check database setup** on the login screen. It should say the database is connected and tables are detected.

## Step 4 — Deploy to Vercel

### Easy GitHub method

1. Create a private GitHub repository.
2. Upload all files from this folder, preserving the `supabase` folder.
3. In Vercel, choose **Add New → Project**.
4. Import the GitHub repository.
5. Use framework preset **Other**.
6. No build command is required.
7. Deploy.
8. Copy the Vercel URL into Supabase Authentication URL Configuration.

### Vercel CLI method

From this folder:

```bash
npx vercel
```

## Important security note

The browser publishable key is intended for client applications and is protected by Row Level Security. Never put a Supabase service-role key, database password, or other secret into `config.js`, GitHub, or the browser.

This MVP should not store Social Security numbers, borrower documents, protected health information, bank statements, or other regulated records until document encryption, detailed role permissions, audit logging, retention controls, and compliance review are added.
