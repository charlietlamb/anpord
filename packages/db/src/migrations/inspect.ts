import { Client } from "pg";
import { dataLossIn } from "./data-loss";
import { migrationsFolder } from "./folder";
import { hasTables, recordedIn } from "./history";
import { type Migration, type Reconciled, reconcile } from "./reconcile";
import { describeTarget } from "./target";

export type Folder = ReturnType<typeof migrationsFolder>;

export class MigrationRefused extends Error {}

export const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

export const indented = (lines: readonly string[]) =>
  lines.map((line) => `  ${line}`).join("\n");

export const DATA_LOSS_FIX =
  "Back it up with pg_dump, then run bun run db:migrate --confirm-data-loss.";

export const connected = async (url: string) => {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });
  await client.connect().catch((cause: unknown) => {
    throw new MigrationRefused(
      `Could not reach ${describeTarget(url)}: ${messageOf(cause)}. Is Postgres running?`
    );
  });
  await client.query("set search_path to public");
  return client;
};

const lossesIn = (
  pending: readonly Migration[],
  acknowledged: Record<string, string>
) =>
  pending.flatMap((migration) =>
    dataLossIn(migration.sql).map((loss) =>
      [
        `${migration.tag} ${loss.effect}: ${loss.statement}`,
        ...(acknowledged[migration.tag]
          ? [`  ${acknowledged[migration.tag]}`]
          : []),
      ].join("\n  ")
    )
  );

export interface DatabaseState {
  readonly fresh: boolean;
  readonly losses: readonly string[];
  readonly migrations: readonly Migration[];
  readonly state: Reconciled;
}

export const readState = async (
  client: Client,
  folder: Folder
): Promise<DatabaseState> => {
  const migrations = folder.migrations();
  const recorded = await recordedIn(client);
  const pushed = recorded.length === 0 && (await hasTables(client));
  const state = reconcile(migrations, recorded, pushed);
  return {
    fresh: recorded.length === 0 && !pushed,
    losses: lossesIn(state.pending, folder.acknowledged()),
    migrations,
    state,
  };
};

export const lossRefused = (read: DatabaseState, confirmDataLoss: boolean) =>
  !(read.fresh || confirmDataLoss) && read.losses.length > 0;

export interface Inspection {
  readonly applied: number;
  readonly edited: readonly string[];
  readonly losses: readonly string[];
  readonly pending: readonly string[];
  readonly problems: readonly string[];
  readonly target: string;
  readonly total: number;
}

export const inspect = async (
  url: string,
  options: { readonly confirmDataLoss: boolean; readonly folder?: Folder }
): Promise<Inspection> => {
  const folder = options.folder ?? migrationsFolder();
  const target = describeTarget(url);
  const folderProblems = folder.problems();
  if (folderProblems.length > 0) {
    return {
      applied: 0,
      edited: [],
      losses: [],
      pending: [],
      problems: folderProblems,
      target,
      total: folder.journal().entries.length,
    };
  }

  const client = await connected(url);
  try {
    await client.query("begin read only");
    const read = await readState(client, folder);
    return {
      applied: read.state.applied.length,
      edited: read.state.edited.map((migration) => migration.tag),
      losses: read.losses,
      pending: read.state.pending.map((migration) => migration.tag),
      problems: [
        ...read.state.problems,
        ...(lossRefused(read, options.confirmDataLoss)
          ? [`A pending migration loses data. ${DATA_LOSS_FIX}`]
          : []),
      ],
      target,
      total: read.migrations.length,
    };
  } finally {
    await client.query("rollback").catch(() => undefined);
    await client.end();
  }
};
