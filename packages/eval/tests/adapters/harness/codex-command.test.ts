import { describe, expect, it } from "bun:test";
import { codexCommand } from "../../../src/adapters/harness/codex";
import type { RunHarness } from "../../../src/ports/harness";

const request = (overrides: Partial<RunHarness> = {}): RunHarness =>
  ({
    harness: "codex",
    harnessVersion: "0.144.4",
    model: "gpt-5-codex",
    prompt: "add a footer",
    sandbox: {} as RunHarness["sandbox"],
    workspace: "/tmp/anpord-task",
    ...overrides,
  }) as RunHarness;

describe("the codex command", () => {
  /**
   * Codex authenticates here as a ChatGPT account, and that path refuses every
   * model passed explicitly: `gpt-5-codex`, `gpt-5`, `codex-mini-latest` and
   * `o3` each return `400 ... not supported when using Codex with a ChatGPT
   * account`, including the model Codex itself picks when the flag is absent.
   *
   * So the absence of `--model` is a decision, not an omission, and passing
   * the column's model would fail every trial rather than compare anything.
   * This test exists to make the next person read that before adding it back.
   */
  it("sends no model, because this account refuses every one", () => {
    const line = codexCommand(request({ model: "gpt-5-mini" }));

    expect(line).not.toContain("--model");
    expect(line).not.toContain("-c model=");
  });

  it("still closes stdin, so codex does not wait on a terminal", () => {
    expect(codexCommand(request())).toContain("< /dev/null");
  });

  it("runs in the workspace the trial prepared", () => {
    expect(codexCommand(request({ workspace: "/tmp/other" }))).toStartWith(
      "cd /tmp/other &&"
    );
  });

  /** A prompt is customer text and will eventually contain a quote. Asked of a
   * real shell rather than by searching the string, because a `;` inside
   * quotes is harmless and only the shell knows which kind it is. */
  it("quotes a prompt that would otherwise end the command", async () => {
    const hostile = "x'; touch /tmp/anpord-pwned; echo '";
    const line = codexCommand(request({ prompt: hostile }));
    const argv = line.slice(line.indexOf("--dangerously"));
    const prompt = argv.slice(
      argv.indexOf("'"),
      argv.lastIndexOf("< /dev/null")
    );

    const printed = await new Response(
      Bun.spawn(["sh", "-c", `printf '%s\\n' ${prompt}`]).stdout
    ).text();

    expect(printed.split("\n")[0]).toBe(hostile);
  });
});
