import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { command } from "../../src/evals/command";
import { suite } from "../../src/evals/define";
import { compileFixture } from "../fixtures/compile-eval";

let workspace: string | undefined;

afterEach(async () => {
  if (workspace !== undefined) {
    await rm(workspace, { force: true, recursive: true });
  }
});

const compiledFrom = async (source: string) => {
  workspace = await mkdtemp(join(tmpdir(), "anpord-command-"));
  const entry = join(workspace, "eval.ts");
  await writeFile(entry, source);
  return await compileFixture(entry);
};

const definitionWith = (validate: string, id = '"checks"') => `
import { command, suite } from "anpord";
export default suite({
  id: ${id},
  name: "checks",
  prompt: "Write hello.txt",
  trials: 1,
  variants: [{ harness: "codex", model: "gpt-5.6-sol" }],
  cases: [{ id: "writes", name: "writes", validate: ${validate} }],
});`;

const COMBINED = /combines a command/;
const NEEDS_ID = /needs an id/;
const NEEDS_COMMAND = /needs a shell command/;

describe("a command validator", () => {
  test("compiles to the case's verify command, with no bundled validator", async () => {
    const request = await compiledFrom(
      definitionWith('command("test -f hello.txt")')
    );

    expect(request.cases[0]?.verify).toBe("test -f hello.txt");
    expect(request.cases[0]?.validator).toBeNull();
  });

  test("cannot share a case with other validators", async () => {
    await expect(
      compiledFrom(definitionWith('[command("true"), () => true]'))
    ).rejects.toThrow(COMBINED);
  });

  test("refuses an empty command", () => {
    expect(() => command(" ")).toThrow(NEEDS_COMMAND);
  });
});

describe("a suite id", () => {
  test("is required when a suite is defined", () => {
    expect(() =>
      suite({
        cases: [{ id: "a", name: "a", validate: command("true") }],
        name: "Checkout flow",
        prompt: "x",
        trials: 1,
        variants: [{ harness: "codex", model: "m" }],
      } as never)
    ).toThrow(NEEDS_ID);
  });

  test("is refused by the compiler when it is not a handle", async () => {
    await expect(
      compiledFrom(definitionWith('command("true")', '"Checkout Flow"'))
    ).rejects.toThrow(NEEDS_ID);
  });
});

describe("a name", () => {
  test("defaults to the id for a suite and a case that leave it out", async () => {
    const request = await compiledFrom(`
import { command, suite } from "anpord";
export default suite({
  id: "unnamed",
  prompt: "Write hello.txt",
  trials: 1,
  variants: [{ harness: "codex", model: "gpt-5.6-sol" }],
  cases: [{ id: "writes-hello", validate: command("test -f hello.txt") }],
});`);

    expect(request.suite.name).toBe("unnamed");
    expect(request.cases[0]?.name).toBe("writes-hello");
  });
});
