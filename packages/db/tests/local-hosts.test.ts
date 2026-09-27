import { describe, expect, it } from "bun:test";
import { ConfigProvider, Effect } from "effect";
import { describeDatabase } from "../src/describe";
import { isLocalHost } from "../src/local-hosts";
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

  it("ignores case, since hostnames are case-insensitive", () => {
    expect(isLocalHost("LOCALHOST")).toBe(true);
    expect(isLocalHost("LocalHost")).toBe(true);
  });

  it("treats a real hostname as not local", () => {
    expect(isLocalHost("db.internal.example.com")).toBe(false);
  });
});

describe("describeDatabase and isLocal classify each database url", () => {
  const cases = [
    ["postgres://localhost:5432/db", true],
    ["postgres://LOCALHOST:5432/db", true],
    ["postgres://127.0.0.1:5432/db", true],
    ["postgres://[::1]:5432/db", true],
    ["postgres://0.0.0.0:5432/db", true],
    ["postgres://db.internal.example.com:5432/db", false],
    ["postgres://localhost.example.com:5432/db", false],
  ] as const;

  for (const [url, expected] of cases) {
    it(`calls ${url} ${expected ? "local" : "remote"}`, async () => {
      expect({ described: await localOf(url), target: isLocal(url) }).toEqual({
        described: expected,
        target: expected,
      });
    });
  }
});
