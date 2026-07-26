# FollowMee database schema

## Existing database (normal path)

Do not run `followmee-clean-schema.sql` against an existing database. The
production-style, data-preserving path is:

```powershell
cd C:\PAom\FollowMee\Backend
npm run typeorm -- migration:run -d src/config/database.ts
```

`RepairSchemaDrift1790000000000` was applied to the local `followmee` database
on 24 July 2026 after a SQL backup was created. TypeORM `synchronize` must
remain disabled.

## Empty database / full reset only

`followmee-clean-schema.sql` is the canonical clean schema for MySQL 8+ or
MariaDB 10.6+. It includes all tables used by the current backend, foreign keys,
indexes, constraints and role/permission seed data.

Before running it:

1. Stop the FollowMee backend.
2. Export the current `followmee` database from Beekeeper Studio or phpMyAdmin.
3. Read the warning at the top of the SQL file.
4. Run the entire file as one script.
5. Start FollowMee, register the first account, then run the final commented
   `INSERT INTO user_roles` statement with your email.

Do not combine this schema with `synchronize: true`. The application
configuration should keep TypeORM `synchronize: false` and use explicit
migrations for future changes.
