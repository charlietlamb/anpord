import { expect, test } from "bun:test";
import { Schema } from "effect";
import { EvalSourceFiles } from "../src/domain/eval-source-files";

const decode = Schema.decodeUnknownSync(EvalSourceFiles);

test.each([
  "/absolute.ts",
  "../outside.ts",
  "evals/../outside.ts",
  "C:\\source.ts",
  "evals//source.ts",
  "secret\0.ts",
])("rejects unsafe source paths: %s", (path) => {
  expect(() => decode([{ path, content: "" }])).toThrow();
});

test("limits source count, total size, and duplicate paths", () => {
  const file = { path: "eval.ts", content: "" };
  expect(() => decode([file, file])).toThrow();
  expect(() =>
    decode(
      Array.from({ length: 101 }, (_, index) => ({
        path: `${index}.ts`,
        content: "",
      }))
    )
  ).toThrow();
  expect(() => decode([{ ...file, content: "x".repeat(1_000_001) }])).toThrow();
  expect(() =>
    decode([
      { ...file, content: "x".repeat(500_001) },
      { path: "check.ts", content: "x".repeat(500_000) },
    ])
  ).toThrow();
});
