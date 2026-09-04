import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { HarnessEvent } from "../../src/domain/harness-event";
import { type Evidence, type Scorer, scoresOf } from "../../src/sdk/define";
import {
  answerContainsAll,
  answerContainsAny,
  answerContainsNone,
} from "../../src/sdk/scorers";

const answered = (...texts: readonly string[]): readonly HarnessEvent[] =>
  texts.map((text) => ({ _tag: "Message", role: "assistant", text }));

const evidenceOf = (events: readonly HarnessEvent[]): Evidence => ({
  events,
  exec: () => Effect.die("a content scorer must not touch the sandbox"),
});

const run = (scorer: Scorer, events: readonly HarnessEvent[]) =>
  Effect.runPromise(scorer(evidenceOf(events))).then((result) =>
    scoresOf(result)
  );

const only = async (scorer: Scorer, events: readonly HarnessEvent[]) => {
  const [score] = await run(scorer, events);

  if (score === undefined) {
    throw new Error("the scorer reported nothing");
  }

  return score;
};

describe("answerContainsAny", () => {
  test("passes when one needle appears", async () => {
    const score = await only(
      answerContainsAny(["eight", "nine"]),
      answered("There are eight planets.")
    );

    expect(score.score).toBe(1);
    expect(score.evidence).toBe("found eight");
  });

  test("fails when none appears", async () => {
    const score = await only(
      answerContainsAny(["eight"]),
      answered("I could not tell.")
    );

    expect(score.score).toBe(0);
    expect(score.evidence).toBe("none found");
  });

  /* Nothing was asserted, so nothing was met. The mirror of
     answerContainsNone, which passes on the same input. */
  test("fails on no needles, which assert nothing to find", async () => {
    const score = await only(answerContainsAny([]), answered("anything"));

    expect(score.score).toBe(0);
  });

  test("reads only the final answer, not an earlier one it retracted", async () => {
    const score = await only(
      answerContainsAny(["eight"]),
      answered("There are eight.", "Correction: nine.")
    );

    expect(score.score).toBe(0);
  });

  test("takes the caller's name over the needles", async () => {
    const score = await only(
      answerContainsAny(["eight"], "counted the planets"),
      answered("eight")
    );

    expect(score.name).toBe("counted the planets");
  });
});

describe("answerContainsAll", () => {
  test("passes only when every needle appears", async () => {
    const events = answered("The answer is eight, and it orbits the sun.");

    expect(
      (await only(answerContainsAll(["eight", "sun"]), events)).score
    ).toBe(1);
    expect(
      (await only(answerContainsAll(["eight", "moon"]), events)).score
    ).toBe(0);
  });

  /* Names what is missing rather than saying "no": a failure a reader has to
     grep the journal to explain is not evidence. */
  test("names the needles that were missing", async () => {
    const score = await only(
      answerContainsAll(["eight", "moon", "sun"]),
      answered("There are eight.")
    );

    expect(score.evidence).toBe("missing moon, sun");
  });

  test("passes on no needles, every one of which is present", async () => {
    expect((await only(answerContainsAll([]), answered("x"))).score).toBe(1);
  });
});

describe("answerContainsNone", () => {
  test("scores 1 when no needle appears", async () => {
    const score = await only(
      answerContainsNone(["sorry", "cannot"]),
      answered("There are eight planets.")
    );

    expect(score.score).toBe(1);
    expect(score.evidence).toBe("none found");
  });

  test("scores 0 and names the offender", async () => {
    const score = await only(
      answerContainsNone(["sorry", "cannot"]),
      answered("Sorry, I cannot help.")
    );

    expect(score.score).toBe(0);
    expect(score.evidence).toBe("found sorry, cannot");
  });

  test("passes on no needles", async () => {
    expect((await only(answerContainsNone([]), answered("x"))).score).toBe(1);
  });
});

/* A documented decision rather than an accident: an agent that capitalised the
   first word of a sentence has not given a different answer. */
describe("matching case", () => {
  test("is insensitive in both directions", async () => {
    expect(
      (await only(answerContainsAny(["Eight"]), answered("eight"))).score
    ).toBe(1);
    expect(
      (await only(answerContainsAny(["eight"]), answered("EIGHT"))).score
    ).toBe(1);
    expect(
      (await only(answerContainsNone(["SORRY"]), answered("sorry"))).score
    ).toBe(0);
  });
});

describe("an agent that said nothing", () => {
  test("contains no needle, so any fails and none passes", async () => {
    expect((await only(answerContainsAny(["x"]), [])).score).toBe(0);
    expect((await only(answerContainsNone(["x"]), [])).score).toBe(1);
  });
});
