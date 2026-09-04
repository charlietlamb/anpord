import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeCommandLine } from "../../../src/adapters/harness/command-events";

const FIXTURES = join(import.meta.dir, "../../fixtures");

const PROMPT = "Add a note";

const runAgent = (script: string) => {
  const workspace = mkdtempSync(join(tmpdir(), "anpord-command-agent-"));
  const result = Bun.spawnSync(["bash", join(FIXTURES, script)], {
    env: {
      ...process.env,
      ANPORD_HOME: workspace,
      ANPORD_MODEL: "sample/model",
      ANPORD_PROMPT: PROMPT,
      ANPORD_WORKSPACE: workspace,
    },
    stdin: "ignore",
  });

  const lines = result.stdout
    .toString()
    .split("\n")
    .filter((line) => line !== "");

  const events = lines.flatMap(
    (line) => decodeCommandLine(line, 0).events ?? []
  );
  const usage = lines.flatMap((line) => {
    const decoded = decodeCommandLine(line, 0).usage;

    return decoded === undefined ? [] : [decoded];
  });

  return { events, exitCode: result.exitCode, usage, workspace };
};

describe("the reference command agent", () => {
  it("does what it reports", () => {
    const { events, exitCode, usage, workspace } = runAgent("command-agent.sh");

    expect(exitCode).toBe(0);
    expect(events.map((event) => event._tag)).toEqual([
      "Message",
      "Command",
      "FileChange",
      "Finished",
    ]);
    expect(usage).toEqual([
      {
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        inputTokens: 12,
        outputTokens: 4,
        totalTokens: 16,
      },
    ]);
    expect(readFileSync(join(workspace, "notes.txt"), "utf8")).toBe(
      `${PROMPT}\n`
    );
  });

  it("has a twin that reports and does nothing", () => {
    const { events, exitCode, workspace } = runAgent("command-agent-lying.sh");

    expect(exitCode).toBe(0);
    expect(events.map((event) => event._tag)).toEqual(["Finished"]);
    expect(existsSync(join(workspace, "notes.txt"))).toBe(false);
  });
});
