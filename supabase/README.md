# Supabase — Firefly OS v0.3.2

For an existing v0.3.1 deployment, run `v0.3.2-company-manager.sql` once before
deploying the application.

The migration adds the workspace company directory, seeds the current company
names, applies access policies, and installs safe company renaming. It does not
delete existing operational or authentication data.

The final query should list the active Firefly companies. New installations
must run the SQL migrations in version order.
