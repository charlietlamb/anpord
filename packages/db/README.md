# @anpord/db

The Drizzle schema, the connection pool, and the migrations that shape every database.

## Commands

Run these from the repository root.

```sh
bun run db:generate --name a_batch_keeps_its_key   # write a migration from the schema
bun run db:status                                  # what migrate would do, read only
bun run db:migrate --dry-run                       # the pending SQL files and their data loss, read only
bun run db:migrate                                 # apply pending migrations
bun run db:reset                                   # drop and rebuild a local database
bun run db:check                                   # check the migrations folder
bun run db:studio                                  # browse the database
```

Every command picks its database the way the app does. `DATABASE_URL` wins, then `.env.local`, then `.env`. Each one prints the database it works on before it does anything. To migrate another database, name it: `DATABASE_URL=postgres://... bun run db:migrate`.

## Changing the schema

1. Edit the table files in `src/schema/`.
2. Run `bun run db:generate --name <what_changed>`. Name it for what the database now does, like the rest of `drizzle/`.
3. Read the SQL file it prints. If it drops, deletes, truncates or retypes anything, the command says so.
4. Run `bun run db:migrate`.

`db:generate` wraps `drizzle-kit generate` and fixes the new journal entry's date. Drizzle dates an entry with the clock, and only applies a migration dated after the newest one a database has. Several entries in the journal were dated by hand into the future, so a freshly generated one came out older and drizzle skipped it without a word. `db:generate` dates the new entry one millisecond after the entry before it whenever the clock says earlier.

## Checking before you migrate

`bun run db:status` prints the database, how many migrations it has applied, the tags still pending, and every reason `db:migrate` would refuse, each with the command that fixes it. It exits non-zero when migrate would refuse. `bun run db:migrate --dry-run` lists the pending SQL files in order and any data they lose. Both only read, inside a read-only transaction.

## Migrating

`db:migrate` applies every pending migration in one transaction, so a failure changes nothing. A database that is already up to date takes about a tenth of a second.

It refuses to start, and says what to do, when:

- The journal is out of order, names a file that is missing, or a `.sql` file is not in the journal.
- The database has tables but no migration history. That is what `drizzle-kit push` leaves, and replaying the migrations would fail on tables that already exist. If the database already matches the schema up to some migration, `bun run db:migrate --record <tag>` records every migration up to that tag as applied without running it, then applies the rest.
- The database has a migration this checkout does not, or one recorded under a date the journal has since changed.
- A migration never ran but a later one did, which drizzle would skip for good.
- A pending migration loses data. It lists each statement and asks for a backup. Rerun with `--confirm-data-loss` once you have one. A new, empty database skips this, since it has nothing to lose.

Use `db:migrate`, not `drizzle-kit migrate` or `drizzle-kit push`. Push records nothing, so the next migrate against that database fails.

## Resetting a local database

`bun run db:reset` drops the database, creates it empty and applies every migration, in under a second. It only works on `localhost`. If the database exists, it asks for `--yes` first, because everything in it is deleted.

## Data loss

`drizzle/data-loss.json` names every migration that drops a table or column, deletes or truncates rows, or changes a column's type, with a line on what is lost and why that is fine. `bun run check` runs `db:check`, which fails on any such migration missing from that file. It also fails on an out-of-order journal. Prefer an additive change. When a drop is the right call, carry the data over in the same migration and write down why.

## Tests that need a database

Tests that write rows read only `EVAL_TEST_DATABASE_URL`, never `DATABASE_URL`, and refuse to start unless the database name has `test` or `scratch` in it. That keeps them off your dev database and anything hosted. Make a scratch database, migrate it, point the tests at it, then drop it:

```sh
createdb anpord_scratch_mine
DATABASE_URL=postgresql://localhost:5432/anpord_scratch_mine bun run db:migrate
EVAL_REQUIRE_DATABASE=1 EVAL_TEST_DATABASE_URL=postgresql://localhost:5432/anpord_scratch_mine bun run test
dropdb anpord_scratch_mine
```

`EVAL_REQUIRE_DATABASE=1` turns a missing URL into an error instead of a silent skip.
