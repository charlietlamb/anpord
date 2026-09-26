import { Effect } from "effect";
import { Client } from "pg";
import { ownCluster, stopCluster } from "./database";
import { startServer } from "./server";

/* Each resource carries its own release: a single try/finally protects only the last acquired, which once orphaned a running cluster. */
export const database = (stateDirectory: string, keepRunning: boolean) =>
  Effect.acquireRelease(
    Effect.promise(() => ownCluster(stateDirectory)),
    (cluster) =>
      keepRunning
        ? Effect.void
        : Effect.promise(() => stopCluster(cluster)).pipe(Effect.asVoid)
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
