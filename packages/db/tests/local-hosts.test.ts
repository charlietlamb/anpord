import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect } from "effect";
import { describeDatabase } from "../src/describe";
import { isLocalHost, LOCAL_HOSTS } from "../src/local-hosts";
import { isLocal } from "../src/migrations/target";

const localOf = (url: string) =>
  Effect.runPromise(
    describeDatabase.pipe(
      Effect.map((database) => database.local),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([["DATABASE_URL", url]]))
      )
    )
  );

describe("isLocalHost", () => {
  it("treats every loopback spelling as local", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("0.0.0.0")).toBe(true);
    expect(isLocalHost("[::1]")).toBe(true);
    expect(isLocalHost("::1")).toBe(true);
  });

  it("treats a real hostname as not local", () => {
    expect(isLocalHost("db.internal.example.com")).toBe(false);
  });
});

describe("describeDatabase and isLocal agree on the same set of local hosts", () => {
  const urls = [
    "postgres://localhost:5432/db",
    "postgres://127.0.0.1:5432/db",
    "postgres://[::1]:5432/db",
    "postgres://0.0.0.0:5432/db",
    "postgres://db.internal.example.com:5432/db",
  ];

  for (const url of urls) {
    it(`agrees on ${url}`, async () => {
      expect(await localOf(url)).toBe(isLocal(url));
      expect(await localOf(url)).toBe(LOCAL_HOSTS.has(new URL(url).hostname));
    });
  }
});
