import { Effect } from "effect";
import { Client } from "pg";
import { startDatabase, stopDatabase } from "./database";
import { startServer } from "./server";

/**
 * Each resource carries its own release, so a run that dies part way through
 * still gives the cluster, the server, and the connection back. A single
 * try/finally could only ever protect whichever resource was acquired last,
 * which is how a failed server start used to orphan a running cluster.
 */
export const database = (dataDirectory: string, keepRunning: boolean) =>
  Effect.acquireRelease(
    Effect.promise(() => startDatabase(dataDirectory)),
    () =>
      keepRunning
        ? Effect.void
        : Effect.promise(() => stopDatabase(dataDirectory)).pipe(Effect.asVoid)
  );

export const server = (
  repositoryRoot: string,
  databaseUrl: string,
  port: number
) =>
  Effect.acquireRelease(
    Effect.promise(() => startServer(repositoryRoot, databaseUrl, port)),
    (running) => Effect.sync(() => running.stop())
  );

export const connection = (connectionString: string) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const client = new Client({ connectionString });
      await client.connect();
      return client;
    }),
    (client) => Effect.promise(() => client.end())
  );
