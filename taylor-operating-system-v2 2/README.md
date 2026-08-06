# Taylor Operating System v2

A real shared Next.js + Supabase project-management system for Firefly Mortgage, Medical, NP Franchise, Boba Tea, Construction, Lake House, and cross-business AI initiatives.

## What works

- Email/password authentication
- Shared Supabase database
- Real-time task and loan updates
- Executive dashboard
- Task creation and ownership
- Business and owner filtering
- Mortgage pipeline with four active loans
- Tasks grouped by individual
- Responsive desktop/mobile interface

## 1. Run the database setup

In Supabase, open **SQL Editor**, paste the entire contents of `supabase/setup.sql`, and click **Run**.

Then confirm these tables appear under **Table Editor**:

- people
- tasks
- loans

## 2. Add Vercel environment variables

In Vercel, open your project and go to **Settings → Environment Variables**. Add:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://boxxiunkctvxfqnosmdc.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key

Apply both variables to Production, Preview, and Development, then redeploy.

## 3. Upload to GitHub

Upload the **contents of this folder** to the top level of your GitHub repository. The repository root should show:

- `app/`
- `lib/`
- `supabase/`
- `package.json`
- `README.md`

Do not put everything inside another nested folder unless Vercel Root Directory is set to that folder.

## 4. Vercel settings

- Framework Preset: Next.js (auto-detected)
- Build Command: `next build` (auto-detected)
- Output Directory: leave blank
- Root Directory: repository root, unless files are nested

Vercel will run `npm install` and deploy automatically.

## 5. Supabase authentication URLs

Under **Authentication → URL Configuration**:

- Site URL: your primary Vercel URL
- Redirect URL: `https://your-domain.vercel.app/**`

## Email confirmation testing

If Supabase's built-in email service rate-limits you, wait for the rate limit to reset or configure a custom SMTP provider. Existing confirmed users can continue signing in.

## Security note

This version is appropriate for ordinary business task data. Do not upload borrower SSNs, bank statements, medical records, PHI, or other regulated data until role-specific permissions, audit logs, encrypted file storage, and compliance controls are added.
