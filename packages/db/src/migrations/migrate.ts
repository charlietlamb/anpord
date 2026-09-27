import type { Client } from "pg";
import { migrationsFolder } from "./folder";
import { ensureHistory, record } from "./history";
import {
  connected,
  DATA_LOSS_FIX,
  type DatabaseState,
  type Folder,
  indented,
  lossRefused,
  MigrationRefused,
  messageOf,
  readState,
} from "./inspect";
import { type Migration, throughTag } from "./reconcile";
import { describeTarget } from "./target";

export interface MigrateOptions {
  readonly confirmDataLoss: boolean;
  readonly folder?: Folder;
  readonly record?: string;
  readonly say?: (line: string) => void;
}

const LOCK = 7_041_993_551;

const ALREADY_THERE = new Set(["42P07", "42701", "42710", "42P06"]);

const STATEMENT_BREAK = "--> statement-breakpoint";

const codeOf = (cause: unknown) =>
  typeof cause === "object" && cause !== null && "code" in cause
    ? String(cause.code)
    : "";

const apply = async (client: Client, migration: Migration) => {
  const statements = migration.sql
    .split(STATEMENT_BREAK)
    .filter((statement) => statement.trim() !== "");
  for (const statement of statements) {
    await client.query(statement).catch((cause: unknown) => {
      const hint = ALREADY_THERE.has(codeOf(cause))
        ? ` The database already has this change, most likely from drizzle-kit push. If it has everything ${migration.tag} adds, record it with bun run db:migrate --record ${migration.tag}.`
        : "";
      throw new MigrationRefused(
        `${migration.tag} failed: ${messageOf(cause)}.${hint} Nothing was changed.`
      );
    });
  }
  await record(client, migration);
};

const recordThrough = async (
  client: Client,
  folder: Folder,
  read: DatabaseState,
  tag: string,
  say: (line: string) => void
) => {
  const toRecord = throughTag(read.migrations, read.state.pending, tag);
  if (toRecord === undefined) {
    throw new MigrationRefused(
      `${tag} is not a migration in drizzle/meta/_journal.json.`
    );
  }
  await ensureHistory(client);
  for (const migration of toRecord) {
    await record(client, migration);
    say(`Recorded ${migration.tag} as applied without running it.`);
  }
  return readState(client, folder);
};

const applyPending = async (
  client: Client,
  pending: readonly Migration[],
  fresh: boolean,
  say: (line: string) => void
) => {
  if (pending.length === 0) {
    return;
  }
  await ensureHistory(client);
  const started = performance.now();
  for (const migration of pending) {
    const each = performance.now();
    await apply(client, migration);
    if (!fresh) {
      say(
        `Applied ${migration.tag} in ${Math.round(performance.now() - each)}ms.`
      );
    }
  }
  if (fresh) {
    say(
      `Applied all ${pending.length} migrations in ${Math.round(performance.now() - started)}ms.`
    );
  }
};

const settle = async (
  client: Client,
  url: string,
  options: MigrateOptions,
  folder: Folder,
  say: (line: string) => void
) => {
  const first = await readState(client, folder);
  const read =
    options.record === undefined
      ? first
      : await recordThrough(client, folder, first, options.record, say);

  for (const migration of read.state.edited) {
    say(
      `${migration.tag} changed after this database applied it. The database kept the version it ran.`
    );
  }
  if (read.state.problems.length > 0) {
    throw new MigrationRefused(
      `${describeTarget(url)} disagrees with the migrations folder, so nothing was applied:\n${indented(read.state.problems)}`
    );
  }
  if (lossRefused(read, options.confirmDataLoss)) {
    throw new MigrationRefused(
      `Migrating ${describeTarget(url)} would lose data:\n${indented(read.losses)}\n${DATA_LOSS_FIX}`
    );
  }

  await applyPending(client, read.state.pending, read.fresh, say);
  say(
    `${describeTarget(url)} is up to date with ${read.migrations.length} migrations.`
  );
  return { applied: read.state.pending.map((migration) => migration.tag) };
};

export const migrate = async (url: string, options: MigrateOptions) => {
  const say = options.say ?? console.log;
  const folder = options.folder ?? migrationsFolder();
  const problems = folder.problems();
  if (problems.length > 0) {
    throw new MigrationRefused(
      `The migrations folder is not safe to apply:\n${indented(problems)}`
    );
  }

  const client = await connected(url);
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock($1)", [LOCK]);
    const outcome = await settle(client, url, options, folder, say);
    await client.query("commit");
    return outcome;
  } catch (cause) {
    await client.query("rollback").catch(() => undefined);
    throw cause;
  } finally {
    await client.end();
  }
};
