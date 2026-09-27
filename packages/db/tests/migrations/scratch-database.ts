import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { testDatabaseUrl } from "../../src/test-database";

const withServer = async <A>(
  base: string,
  work: (client: Client) => Promise<A>
) => {
  const server = new URL(base);
  server.pathname = "/postgres";
  const client = new Client({ connectionString: server.toString() });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
};

export const scratchDatabases = () => {
  const base = testDatabaseUrl();
  const created: string[] = [];

  const create = async () => {
    const name = `anpord_migrate_test_${randomBytes(4).toString("hex")}`;
    await withServer(base ?? "", (client) =>
      client.query(`create database ${name}`)
    );
    created.push(name);
    const url = new URL(base ?? "");
    url.pathname = `/${name}`;
    return url.toString();
  };

  const dropAll = () =>
    withServer(base ?? "", async (client) => {
      for (const name of created.splice(0)) {
        await client.query(`drop database if exists ${name} with (force)`);
      }
    });

  return { create, dropAll, skip: base === undefined };
};
