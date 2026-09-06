import { expect, test } from "bun:test";
import { Schema } from "effect";
import { CaseCache } from "../src/domain/evals";

test.each([
  ".",
  "./",
  ".anpord",
  "./.anpord/api",
  "../cache",
  "/cache",
])("rejects cache path %s", (path) => {
  expect(() =>
    Schema.decodeUnknownSync(CaseCache)({ key: "cache", path })
  ).toThrow();
});

test.each([
  "node_modules",
  "./build",
  "apps/example/cache",
])("accepts cache path %s", (path) => {
  expect(Schema.decodeUnknownSync(CaseCache)({ key: "cache", path }).path).toBe(
    path
  );
});
