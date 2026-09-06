import { expect, test } from "bun:test";
import { Schema } from "effect";
import { EvalTrigger } from "../../src/domain/eval-trigger";

const decode = Schema.decodeUnknownSync(EvalTrigger);

test.each(
  EvalTrigger.fields.source.literals
)("accepts the %s trigger", (source) => {
  expect(decode({ source })).toEqual({ source });
});

test("preserves a CI run link", () => {
  const trigger = {
    source: "ci",
    url: "https://github.com/acme/app/actions/runs/123/attempts/2",
  };
  expect(decode(trigger)).toEqual(trigger);
});

test.each([
  "javascript:alert(1)",
  "file:///tmp/run",
  "https://user:secret@example.com",
  "not a URL",
])("rejects an unsafe trigger link: %s", (url) => {
  expect(() => decode({ source: "ci", url })).toThrow();
});

test("rejects unknown sources", () => {
  expect(() => decode({ source: "invented" })).toThrow();
});
