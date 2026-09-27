import { describe, expect, it } from "bun:test";
import type { EvalTurn } from "@anpord/schema/domain/eval-conversation";
import { TURNS_ENV } from "@anpord/schema/domain/sandbox-env";
import { Effect } from "effect";
import {
  answerEnv,
  writeAnswer,
} from "../../../src/adapters/scorers/validator-protocol";
import { TURNS_PATH } from "../../../src/domain/answer-file";

const sandbox = (written: Map<string, string>) =>
  ({
    home: "/home",
    writeFile: (path: string, body: string) =>
      Effect.sync(() => {
        written.set(path, body);
      }),
  }) as never;

const turns: EvalTurn[] = [
  {
    agentText: "shall I push?",
    commandCount: 1,
    events: [
      {
        _tag: "command",
        command: "git status",
        exitCode: 0,
        finishedAtMillis: 2,
        output: "clean",
        outputTruncated: false,
        startedAtMillis: 1,
      },
    ],
    index: 0,
    userText: "open",
  },
  {
    agentText: "pushed",
    commandCount: 0,
    events: [],
    index: 1,
    userText: "yes",
  },
];

describe("the turns a validator reads", () => {
  it("writes what each side said and did, in order", async () => {
    const written = new Map<string, string>();
    await Effect.runPromise(writeAnswer(sandbox(written), [], turns));

    expect(JSON.parse(written.get(TURNS_PATH("/home")) ?? "[]")).toEqual(turns);
  });

  it("names the file for the validator", () => {
    expect(answerEnv(sandbox(new Map()))[TURNS_ENV]).toBe(TURNS_PATH("/home"));
  });
});
