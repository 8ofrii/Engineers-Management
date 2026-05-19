# Prisma Migrations

The `20260504000000_init` migration is the **baseline** — it represents the schema state through Phases 1–7 (Tenant, User, Project, Transaction, Document, DSR, Invoice, AuditLog, TransactionDraft, the V1.2 Profit-on-Expense models, etc.).

Earlier piecemeal migrations (`20260117150825_initial_setup`, `20260125235557_init_multi_tenant_saas`, `20260210170000_v1_2_profit_on_expense`) and the hand-written `manual_v1_2_migration.sql` were collapsed into this baseline. They live in git history if you ever need them.

## One-time setup on production (already-existing DB)

The Render Postgres has been kept in sync with `prisma db push` historically. Before the new build script can run `prisma migrate deploy`, you must mark the baseline migration as already-applied **once**:

```bash
# Locally, with the prod DATABASE_URL exported
cd server
DATABASE_URL='<render-postgres-url>' npx prisma migrate resolve --applied 20260504000000_init
```

This writes one row to the `_prisma_migrations` table on prod saying "this migration is already there, don't run it." After that, every Render deploy will work as expected: `npm run build` runs `prisma migrate deploy && prisma generate`, which is a no-op until you add a new migration.

## Going forward

To add a schema change:

```bash
cd server
npx prisma migrate dev --name describe_what_changed
```

This creates a new migration folder, applies it locally, and stages the SQL for commit. On the next deploy, Render runs `migrate deploy` which applies any new migrations in order — no more `db push`, no more drift between local and prod.

## Render build command

Set Render's "Build Command" to `npm install && npm run build`. The `npm run build` invokes the `build` script in [package.json](../../package.json) which runs `prisma migrate deploy && prisma generate`.
