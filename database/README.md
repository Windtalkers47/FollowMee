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
- `ProfileConversionPlatform1850000000000` (Phase 1: analytics and Lead Inbox)
- `ProfileTrustCampaign1851000000000` (Phase 2: revisions, link health, merge recovery and scheduling)
- `ProfileCustomDomains1852000000000` (Phase 3: domain verification state; deploy before enabling its flag)
- `ProfileDomainRedirectPreference1853000000000` (Phase 3: additive canonical-domain redirect preference)
- `UatAccessPrivacyCapacity1854000000000` (closed-UAT signup approval, consent/privacy requests, product funnel and capacity alerts)

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
- `public_profile_leads` is an append-first staging inbox. Non-converted lead
  PII is anonymized after 12 months while aggregate events remain.
- `public_profile_revisions`, `public_profile_link_checks` and
  `customer_merge_snapshots` provide recovery/audit boundaries.
- `public_profile_domains` stores verification state only. Vercel tokens stay
  in backend environment variables and the feature flag defaults to disabled.
- `registration_requests` keeps password hashes inaccessible while email verification and Owner approval are pending; no User/role is created before approval.
- `consent_records`, `privacy_requests`, `product_funnel_events` and `system_capacity_alerts` provide versioned privacy evidence, verified rights workflow, opt-in business funnel and deduplicated exact-capacity alerts.
- The clean schema mirrors the MariaDB runtime collation (`utf8mb4_unicode_ci`)
  and UUID columns used by the TypeORM entities; use it only for an empty
  disposable/schema-verification database, never for an existing `followmee`.

### Customer image filter invariant

`customers.customerImageUrl` is intentionally nullable (`VARCHAR(512) NULL`).
The application's missing-image filter means only `customerImageUrl IS NULL` or
`customerImageUrl = ''`; it does not classify a non-empty URL that fails to load
as missing. This invariant requires no schema change or migration.

## Empty database / full reset only

`followmee-clean-schema.sql` is the canonical clean schema for MySQL 8+ or
MariaDB 10.6+. It includes all tables used by the current backend, foreign keys,
indexes, constraints, role/permission seed data, Public Profile tables and the
TypeORM migration ledger for all migrations included in the schema.

For TiDB Starter compatibility, dependent `ADD COLUMN ... AFTER ...` changes
are intentionally separate `ALTER TABLE` statements. TiDB must commit the
referenced column before the following statement positions another column
after it.

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

### Create a clean database from the SQL file

The script creates/selects `followmee`, recreates all current tables, and adds
the indexes and foreign-key relations. Run it only against an empty or
disposable target:

PowerShell:

```powershell
Get-Content -Raw .\database\followmee-clean-schema.sql |
  mariadb --host=localhost --port=3306 --user=root --password
```

Command Prompt, macOS, or Linux:

```text
mariadb --host=localhost --port=3306 --user=root --password < database/followmee-clean-schema.sql
```

To create `followmee_e2e` instead, change both `CREATE DATABASE` and `USE`
identifiers at the top of the SQL file before running it. Never run this clean
schema against an existing production or data-bearing `followmee` database.

## Verify the clean schema safely

The verifier recreates only the disposable `followmee_e2e` database, runs the
complete clean schema, checks tables, foreign keys, migration ledger against
the migration source files, identity columns and seed rows, then drops the
disposable database. Never point this command at `followmee`:

```powershell
cd C:\PAom\FollowMee\Backend
npm run db:schema:verify
```
