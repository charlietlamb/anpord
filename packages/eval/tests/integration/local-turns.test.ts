import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EvalTurn } from "@sphynx/schema/domain/eval-conversation";
import type { EvalUser } from "@sphynx/schema/domain/eval-turns";
import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { ConfigProvider, Effect } from "effect";
import { EvalLocalLive } from "../../src/local-layer";
import { LocalTrials } from "../../src/services/local-trial";

const opted = ConfigProvider.fromMap(
  new Map([["SPHYNX_LOCAL_SANDBOX", "true"]])
).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()));

const AGENT = `
const say = (line) => console.log(JSON.stringify(line));
say({ _tag: "Started", model: "none", sessionId: "s-1" });
if (process.env.SPHYNX_PROMPT.startsWith("fix")) {
  say({ _tag: "Command", command: "npm test", exitCode: 1, output: "1 failing" });
  require("node:fs").writeFileSync("config.json", "{}");
  say({ _tag: "FileChange", paths: [process.cwd() + "/config.json"] });
  say({ _tag: "Message", role: "assistant", text: "Which usage limit?" });
} else {
  say({ _tag: "Command", command: "npm test", exitCode: 0, output: "ok" });
  say({ _tag: "Message", role: "assistant", text: "Done." });
}
`;

let kept: string | undefined;

afterEach(async () => {
  if (kept !== undefined) {
    await rm(kept, { force: true, recursive: true });
    kept = undefined;
  }
});

const runCase = async (user: EvalUser | null) => {
  kept = await mkdtemp(join(tmpdir(), "sphynx-turns-"));
  const copied = join(kept, "turns.json");
  const journal: HarnessEvent[] = [];

  const outcome = await LocalTrials.pipe(
    Effect.flatMap((trials) =>
      trials.run({
        caseName: "a case that reads its turns",
        harness: "command",
        harnessVersion: "1",
        model: "none",
        onProgress: (events) =>
          Effect.sync(() => {
            journal.push(...events);
          }),
        profile: {
          env: null,
          files: {},
          install: null,
          name: "scripted",
          run: "node agent.cjs",
          systemPrompt: null,
          variables: null,
        },
        prompt: "fix the config",
        source: { files: { "agent.cjs": AGENT }, kind: "files" },
        user,
        verifyCommand: `cp "$SPHYNX_TURNS_FILE" ${copied}`,
      })
    ),
    Effect.provide(EvalLocalLive),
    Effect.scoped,
    Effect.withConfigProvider(opted),
    Effect.runPromise
  );

  const turns: EvalTurn[] = JSON.parse(await readFile(copied, "utf8"));

  return { journal, outcome, turns };
};

const shapeOf = (entry: EvalTurn["events"][number]) => {
  switch (entry._tag) {
    case "message":
      return `${entry.role}: ${entry.text}`;
    case "command":
      return `$ ${entry.command} -> ${entry.exitCode}: ${entry.output}`;
    case "fileChange":
      return `wrote ${entry.paths.map((path) => path.split("/").at(-1)).join(", ")}`;
    default:
      return entry._tag;
  }
};

describe("the turns a validator reads", () => {
  it("holds one turn, opened by the prompt, for a case with no user", async () => {
    const { journal, turns } = await runCase(null);

    expect(
      turns.map(({ agentText, commandCount, index, userText }) => ({
        agentText,
        commandCount,
        index,
        userText,
      }))
    ).toEqual([
      {
        agentText: "Which usage limit?",
        commandCount: 2,
        index: 0,
        userText: "fix the config",
      },
    ]);
    expect(
      journal.flatMap((event) =>
        event._tag === "Message" && event.role === "user" ? [event.text] : []
      )
    ).toEqual(["fix the config"]);
  }, 180_000);

  it("puts each command and file change in the turn where it happened", async () => {
    const { turns } = await runCase({ kind: "scripted", replies: ["go on"] });

    expect(turns.map((turn) => turn.events.map(shapeOf))).toEqual([
      [
        "user: fix the config",
        "$ npm test -> 1: 1 failing",
        "wrote config.json",
        "assistant: Which usage limit?",
        "$ node agent.cjs -> null: ",
      ],
      [
        "user: go on",
        "$ npm test -> 0: ok",
        "assistant: Done.",
        "$ node agent.cjs -> null: ",
      ],
    ]);
  }, 180_000);
});
