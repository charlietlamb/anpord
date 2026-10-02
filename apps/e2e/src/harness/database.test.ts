import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Cluster,
  findPostgresBin,
  ownCluster,
  psql,
  resetDatabase,
  stopCluster,
} from "./database";
import { freePort } from "./ports";

const CLUSTER_TIMEOUT = 60_000;

const checkout = () => mkdtempSync(join(tmpdir(), "sphynx-e2e-checkout-"));

const started: Cluster[] = [];
const checkouts: string[] = [];

const own = async (state: string) => {
  const cluster = await ownCluster(state);
  started.push(cluster);
  return cluster;
};

const markerIn = async (cluster: Cluster) =>
  (
    await psql(cluster.port, "select note from marker", "sphynx_e2e")
  ).stdout.trim();

afterAll(async () => {
  await Promise.all(started.map(stopCluster));
  for (const state of checkouts) {
    rmSync(state, { force: true, recursive: true });
  }
});

describe.skipIf(findPostgresBin() === undefined)("the e2e cluster", () => {
  const first = checkout();
  const second = checkout();
  checkouts.push(first, second);

  test(
    "two checkouts get their own clusters, and resetting one leaves the other's data alone",
    async () => {
      const a = await own(first);
      const b = await own(second);

      expect(a.port).not.toBe(b.port);
      expect(a.dataDirectory).not.toBe(b.dataDirectory);

      await resetDatabase(a);
      await psql(a.port, "create table marker (note text)", "sphynx_e2e");
      await psql(
        a.port,
        "insert into marker values ('first checkout')",
        "sphynx_e2e"
      );

      await resetDatabase(b);

      expect(await markerIn(a)).toBe("first checkout");
    },
    CLUSTER_TIMEOUT
  );

  test(
    "a second run of the same checkout reuses its running cluster",
    async () => {
      const before = await ownCluster(first);
      const again = await ownCluster(first);

      expect(again).toEqual(before);
      expect(await markerIn(again)).toBe("first checkout");
    },
    CLUSTER_TIMEOUT
  );

  test(
    "a checkout whose recorded port holds another checkout's cluster is refused",
    async () => {
      const a = await ownCluster(first);
      const intruder = checkout();
      checkouts.push(intruder);
      writeFileSync(
        join(intruder, "postgres.json"),
        JSON.stringify({ port: a.port })
      );

      await expect(ownCluster(intruder)).rejects.toThrow(
        `Port ${a.port} holds a server this checkout did not start`
      );
      expect(await markerIn(a)).toBe("first checkout");
    },
    CLUSTER_TIMEOUT
  );

  test(
    "a port held by something that is not Postgres is refused",
    async () => {
      const port = await freePort();
      const foreign = Bun.listen({
        hostname: "127.0.0.1",
        port,
        socket: {
          data: (socket) => {
            socket.end();
          },
        },
      });
      const state = checkout();
      checkouts.push(state);
      writeFileSync(join(state, "postgres.json"), JSON.stringify({ port }));

      try {
        await expect(ownCluster(state)).rejects.toThrow(
          `Port ${port} holds a server this checkout did not start`
        );
      } finally {
        foreign.stop(true);
      }
    },
    CLUSTER_TIMEOUT
  );
});
