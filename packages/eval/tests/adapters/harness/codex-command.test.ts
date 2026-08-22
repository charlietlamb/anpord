import { describe, expect, it } from "bun:test";
import { codexCommand } from "../../../src/adapters/harness/codex";
import type { RunHarness } from "../../../src/ports/harness";

const request = (overrides: Partial<RunHarness> = {}): RunHarness =>
  ({
    harness: "codex",
    harnessVersion: "0.144.4",
    model: "gpt-5.6-sol",
    prompt: "add a footer",
    sandbox: {} as RunHarness["sandbox"],
    workspace: "/tmp/anpord-task",
    ...overrides,
  }) as RunHarness;

/** A prompt and a model both reach the shell from a form, and a shell cannot
 * tell either from the rest of a command line. Asked of a real shell rather
 * than by searching the string, because a `;` inside quotes is harmless and
 * only the shell knows which kind it is. */
const argumentsOf = async (line: string) => {
  const after = line.slice(line.indexOf("--dangerously"));
  const rest = after
    .replace("--dangerously-bypass-approvals-and-sandbox", "")
    .replace("< /dev/null", "")
    .replace("--model", "");

  const printed = await new Response(
    Bun.spawn(["sh", "-c", `printf '%s\\n' ${rest}`]).stdout
  ).text();

  return printed.trimEnd().split("\n");
};

describe("the codex command", () => {
  /** The model reached this adapter and was dropped for as long as the grid
   * existed, so every column ran whatever Codex defaults to while its header
   * named something else. A comparison of two models by running one twice
   * reports a difference of zero and means nothing by it. */
  it("runs the model the cell was recorded against", () => {
    expect(codexCommand(request({ model: "gpt-5.5" }))).toContain(
      "--model 'gpt-5.5'"
    );
  });

  it("keeps a hostile model to one argument", async () => {
    const hostile = "x'; touch /tmp/anpord-pwned; echo '";

    expect(
      await argumentsOf(codexCommand(request({ model: hostile })))
    ).toEqual([hostile, "add a footer"]);
  });

  it("keeps a hostile prompt to one argument", async () => {
    const hostile = "y'; touch /tmp/anpord-pwned; echo '";

    expect(
      await argumentsOf(codexCommand(request({ prompt: hostile })))
    ).toEqual(["gpt-5.6-sol", hostile]);
  });

  it("still closes stdin, so codex does not wait on a terminal", () => {
    expect(codexCommand(request())).toContain("< /dev/null");
  });

  it("runs in the workspace the trial prepared", () => {
    expect(codexCommand(request({ workspace: "/tmp/other" }))).toStartWith(
      "cd /tmp/other &&"
    );
  });
});
