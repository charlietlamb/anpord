import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  answerEnv,
  writeAnswer,
} from "../../../src/adapters/scorers/validator-protocol";
import { TURNS_ENV, TURNS_PATH } from "../../../src/domain/answer-file";

const sandbox = (written: Map<string, string>) =>
  ({
    home: "/home",
    writeFile: (path: string, body: string) =>
      Effect.sync(() => {
        written.set(path, body);
      }),
  }) as never;

const turns = [
  { agentText: "shall I push?", commandCount: 2, index: 0, userText: "open" },
  { agentText: "pushed", commandCount: 1, index: 1, userText: "yes" },
];

describe("the turns a validator reads", () => {
  it("writes what each side said, in order", async () => {
    const written = new Map<string, string>();
    await Effect.runPromise(writeAnswer(sandbox(written), [], turns));

    expect(JSON.parse(written.get(TURNS_PATH("/home")) ?? "[]")).toEqual(turns);
  });

  it("writes an empty list for a case with no conversation", async () => {
    const written = new Map<string, string>();
    await Effect.runPromise(writeAnswer(sandbox(written), [], undefined));

    expect(written.get(TURNS_PATH("/home"))).toBe("[]");
  });

  it("names the file for the validator", () => {
    expect(answerEnv(sandbox(new Map()))[TURNS_ENV]).toBe(TURNS_PATH("/home"));
  });
});
