import { describe, expect, it } from "bun:test";
import { Effect, Layer, Option } from "effect";
import type { HarnessEvent } from "../../src/domain/harness-event";
import { SimulatedUser } from "../../src/ports/simulated-user";
import { converse } from "../../src/services/conversation";

const said = (text: string, session = "s-1"): HarnessEvent[] => [
  { _tag: "Started", at: 0, model: "m", sessionId: session },
  { _tag: "Message", at: 1, role: "assistant", text },
];

const human = { goal: "g", kind: "simulated", prompt: "p" } as const;

const replies = (queue: readonly string[]) =>
  Layer.succeed(SimulatedUser, {
    reply: ({ spoken }) =>
      Effect.succeed(Option.fromNullable(queue[spoken.length - 1])),
  });

const run = (answers: readonly string[], seen: string[][] = []) =>
  converse({
    opening: "open",
    organizationId: "org",
    run: (turn, resume) => {
      seen.push([turn, Option.getOrElse(resume, () => "new")]);
      return Effect.succeed(said(answers[seen.length - 1] ?? "done"));
    },
    user: human,
  });

describe("a conversation", () => {
  it("ends when the human has nothing more to say", async () => {
    const result = await Effect.runPromise(
      run(["asked?"]).pipe(Effect.provide(replies([])))
    );

    expect(result.ended).toBe("user-done");
    expect(result.turns).toHaveLength(1);
  });

  it("opens a session, then continues that same one", async () => {
    const seen: string[][] = [];
    await Effect.runPromise(
      run(["asked?", "done"], seen).pipe(Effect.provide(replies(["yes"])))
    );

    expect(seen[0]).toEqual(["open", "new"]);
    expect(seen[1]).toEqual(["yes", "s-1"]);
  });

  it("records what each side said, in order", async () => {
    const result = await Effect.runPromise(
      run(["shall I push?", "pushed"]).pipe(Effect.provide(replies(["yes"])))
    );

    expect(result.turns.map((turn) => turn.userText)).toEqual(["open", "yes"]);
    expect(result.turns.map((turn) => turn.agentText)).toEqual([
      "shall I push?",
      "pushed",
    ]);
  });

  it("stops at the ceiling rather than talking forever", async () => {
    const result = await Effect.runPromise(
      run([]).pipe(
        Effect.provide(replies(Array.from({ length: 50 }, () => "go")))
      )
    );

    expect(result.ended).toBe("max-turns");
    expect(result.turns).toHaveLength(8);
  });

  /* A harness that reported no session cannot be continued, so the run is one
     turn rather than an opening prompt scored twice. */
  it("does not continue when no session was reported", async () => {
    const result = await Effect.runPromise(
      converse({
        opening: "open",
        organizationId: "org",
        run: () => Effect.succeed([]),
        user: human,
      }).pipe(Effect.provide(replies(["yes"])))
    );

    expect(result.ended).toBe("failed");
    expect(result.turns).toHaveLength(1);
  });

  it("follows a script without asking a model", async () => {
    const result = await Effect.runPromise(
      converse({
        opening: "open",
        organizationId: "org",
        run: () => Effect.succeed(said("ok")),
        user: { kind: "scripted", replies: ["first", "second"] },
      }).pipe(Effect.provide(replies([])))
    );

    expect(result.turns.map((turn) => turn.userText)).toEqual([
      "open",
      "first",
      "second",
    ]);
  });
});
