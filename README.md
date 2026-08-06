# Taylor Operating System – Project Management MVP

A real shared project-management system replacing the Word task list.

## Included
- Executive dashboard
- Master task board with create, filter, update and delete
- Business workspaces
- Firefly Mortgage loan pipeline and Kanban view
- Team accountability by person
- Meeting notes that create tasks from action lines
- Shared Supabase data and login

## Upgrade the existing deployment
1. Upload the **contents of this folder** to the root of the existing GitHub repository.
2. In Vercel use the project that already works.
3. Framework Preset: Next.js. Root Directory: blank. Build/Output/Install: defaults.
4. Keep the two existing environment variables.
5. Run `supabase/setup.sql` in Supabase SQL Editor. It is safe to run over the earlier schema.
6. Commit the GitHub upload. Vercel should deploy automatically; otherwise redeploy.

## Meeting action syntax
In Meeting Notes, lines beginning with `-` or `*` become tasks:
`- Close Baylee loan | Jimmy | Mortgage`
