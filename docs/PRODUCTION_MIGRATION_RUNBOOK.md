# FollowMee production migration and restore runbook

This runbook applies to the single-organization FollowMee database. Never run the clean-schema script, `schema:drop`, or any reset command against `followmee`.

## Before migration

1. Put the application in maintenance/read-only mode and stop background workers on every instance.
2. Confirm `npm run doctor:db` targets the intended host and database.
3. Create a timestamped backup outside the repository:
   `npm --prefix Backend run db:backup -- C:\Backups\followmee-before-<timestamp>.sql`
4. Verify the backup is non-empty, contains `CREATE TABLE` and `INSERT` statements, and store its SHA-256 checksum.
5. Restore the backup into an isolated database such as `followmee_restore_drill`; never restore over `followmee` for a drill.
6. Compare table counts and critical counts for users, tasks, customers, notifications, reward ledger entries, and migration ledger rows.

## Migration

1. Keep one application instance responsible for migration; other instances remain stopped.
2. Run additive TypeORM migrations only.
3. Inspect the migration ledger, foreign keys, indexes, outbox health, and application logs before enabling writes.
4. Start one instance, run smoke checks, then roll out the remaining instances.

## Rollback and recovery

Prefer a forward-fix for an additive migration. If recovery is required, stop all writes first. Restore the verified backup into a new database, validate it, then switch the configured database during a controlled maintenance window. Never use `DROP DATABASE followmee` or reset the production schema.

Record the operator, timestamps, backup path/checksum, migration IDs, verification counts, and final decision in the deployment log. Do not record passwords, tokens, connection strings, or email-provider credentials.
