# Firefly OS v0.3.0 — AI COO

This release adds an AI operating layer to the production-schema-corrected
Firefly OS application while preserving the existing Supabase schema.

## New in v0.3.0

- Sort the master task board by Task, Business, Owner, Due, Priority, or Status.
- Reverse any sort by clicking the same column heading again.
- Use the new AI COO chat from the main navigation.
- Ask one-click questions about priorities, overdue work, risks, team ownership,
  meetings, and the mortgage pipeline.
- Keep recent chat messages on the signed-in user's current browser.
- Enforce read-only AI access in this release.

## Security and privacy

- The browser sends the signed-in Supabase access token to the Firefly OS server.
- Supabase Row Level Security continues to control which workspace the user can read.
- The OpenAI API key exists only on the server and is never sent to the browser.
- Borrower names, team email addresses, and full meeting transcripts are excluded
  from the AI context.
- OpenAI response storage is disabled for requests made by this release.
- Treat v0.3.0 as an operational assistant, not a PHI or regulated borrower-data
  workflow, until the required vendor agreements and compliance configuration
  have been reviewed and approved.

## Deployment

See `DEPLOYMENT.md`. No Supabase SQL or migration is required.
