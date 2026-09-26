import type { Client } from "pg";
import type { Migration, Recorded } from "./reconcile";

export const recordedIn = async (
  client: Client
): Promise<readonly Recorded[]> => {
  const table = await client.query<{ exists: boolean }>(
    "select to_regclass('drizzle.__drizzle_migrations') is not null as exists"
  );
  if (!table.rows[0]?.exists) {
    return [];
  }
  const rows = await client.query<{ created_at: string; hash: string }>(
    "select hash, created_at from drizzle.__drizzle_migrations order by created_at"
  );
  return rows.rows.map((row) => ({
    createdAt: Number(row.created_at),
    hash: row.hash,
  }));
};

export const hasTables = async (client: Client) => {
  const found = await client.query(
    "select 1 from information_schema.tables where table_schema = 'public' limit 1"
  );
  return (found.rowCount ?? 0) > 0;
};

export const record = (client: Client, migration: Migration) =>
  client.query(
    'insert into drizzle.__drizzle_migrations ("hash", "created_at") values ($1, $2)',
    [migration.hash, migration.when]
  );

export const ensureHistory = (client: Client) =>
  client.query(
    "create schema if not exists drizzle; create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)"
  );
