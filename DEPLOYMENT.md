# Firefly OS v0.3.0 Deployment

## 1. Configure Vercel

In the existing Vercel project, open **Settings → Environment Variables** and add:

- `OPENAI_API_KEY`: the server-side OpenAI API key
- `OPENAI_MODEL`: `gpt-5-mini` (optional; this is the built-in default)

Keep the existing Supabase variables unchanged. Apply the OpenAI key to Production,
Preview, and Development if the AI COO should work in all three environments.

## 2. Deploy the code

Upload the contents of this release folder to the root of the existing GitHub
repository and commit the change. Vercel will build and deploy automatically.

## 3. Verify

1. Confirm the Vercel build completes successfully.
2. Sign in and open **Tasks**. Click every column heading to verify ascending and descending sorting.
3. Open **AI COO** and choose **What is overdue and who owns it?**
4. Confirm the response reflects the current Supabase task data.

No Supabase SQL or schema migration is required for this release.
