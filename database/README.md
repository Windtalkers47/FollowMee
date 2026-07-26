# FollowMee database schema

## Existing database (normal path)

Do not run `followmee-clean-schema.sql` against an existing database. The
production-style, data-preserving path is:

```powershell
cd C:\PAom\FollowMee\Backend
npm run typeorm -- migration:run -d src/config/database.ts
```

The data-preserving migrations currently applied to the local `followmee`
database are:

- `RepairSchemaDrift1790000000000`
- `CreatePublicProfiles1791000000000`
- `RepairUserIdentity1792000000000`

Before the public-profile migration on 26 July 2026, a SQL backup was written
to `C:\PAom\data_backup_20260726\followmee_before_public_profiles.sql`.
TypeORM `synchronize` must remain disabled.

The public publishing model intentionally keeps CRM customers separate from
public content:

- `public_profiles` owns slug, draft/published state, visibility, theme, CTA
  and opt-in contact visibility.
- `public_profile_links` owns ordered public destinations.
- `public_profile_events` stores privacy-preserving engagement events; IP and
  user-agent values are hashed before storage.

## Empty database / full reset only

`followmee-clean-schema.sql` is the canonical clean schema for MySQL 8+ or
MariaDB 10.6+. It includes all tables used by the current backend, foreign keys,
indexes, constraints, role/permission seed data, Public Profile tables and the
TypeORM migration ledger for all migrations included in the schema.

Before running it:

1. Stop the FollowMee backend.
2. Export the current `followmee` database from Beekeeper Studio or phpMyAdmin.
3. Read the warning at the top of the SQL file.
4. Run the entire file as one script.
5. Start FollowMee, register the first account, then run the final commented
   `INSERT INTO user_roles` statement with your email.

Do not run the clean schema against an existing database and do not manually
run old migrations after importing it. The included migration ledger tells
TypeORM that the clean schema already represents the final state.

Do not combine this schema with `synchronize: true`. The application
configuration should keep TypeORM `synchronize: false` and use explicit
migrations for future changes.

## Verify the clean schema safely

The verifier creates only a temporary `followmee_schema_verify` database,
runs the complete clean schema, checks tables, foreign keys, migration ledger,
identity columns and seed rows, then drops the temporary database:

```powershell
cd C:\PAom\FollowMee\Backend
npm run db:schema:verify
```
