import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Either, Schema } from "effect";
import { CommandLine } from "../../src/domain/command-line";
import {
  commandLineJsonSchema,
  harnessEventJsonSchema,
} from "../../src/domain/harness-event-json-schema";

const DOCS_PAGE = join(
  import.meta.dir,
  "../../../../apps/docs/evals/command-harness.mdx"
);

const JSON_FENCE = /```json\n([\s\S]*?)```/g;

const exampleLines = () =>
  Array.from(readFileSync(DOCS_PAGE, "utf8").matchAll(JSON_FENCE)).flatMap(
    ([, body]) => (body ?? "").split("\n").filter((line) => line !== "")
  );

const decode = Schema.decodeUnknownEither(CommandLine);

describe("the published command harness contract", () => {
  it("shows one example line per event tag and the usage line", () => {
    const tags = exampleLines().map(
      (line) => (JSON.parse(line) as { _tag: string })._tag
    );

    expect(tags).toEqual([
      "Started",
      "Message",
      "Command",
      "FileChange",
      "ToolCall",
      "Usage",
      "Finished",
    ]);
  });

  it.each(exampleLines())("decodes the documented line %s", (line) => {
    expect(Either.isRight(decode(JSON.parse(line)))).toBe(true);
  });

  it("names every tag in the JSON schema", () => {
    const rendered = JSON.stringify(commandLineJsonSchema);

    for (const tag of [
      "Started",
      "Message",
      "Command",
      "FileChange",
      "ToolCall",
      "Usage",
      "Finished",
    ]) {
      expect(rendered).toContain(`"${tag}"`);
    }

    expect(JSON.stringify(harnessEventJsonSchema)).not.toContain('"Usage"');
  });
});
