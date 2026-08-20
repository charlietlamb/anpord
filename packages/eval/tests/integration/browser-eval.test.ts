import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { TrialOutcome } from "../../src/domain/trial";
import { Scorer } from "../../src/ports/scorer";
import { makeLocalAdapter } from "../../src/providers/local";
import { ScorerGroundTruthLive } from "../../src/scoring/ground-truth";
import { type FixtureSite, startFixtureSite } from "../fixtures/site/server";

let site: FixtureSite;

beforeEach(async () => {
  site = await startFixtureSite();
});

afterEach(async () => {
  await site.close();
});

/**
 * The whole point of the fixture server: a browser side effect becomes
 * filesystem state, so the product scores a browser agent with exactly the
 * mechanism it already uses for a coding agent. Nothing about the model
 * changes, and the verifier stays a shell command with an exit code.
 */
const scoreAgainstSite = (verify: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* makeLocalAdapter;

      const sandbox = yield* adapter.open({
        autoStopMinutes: 1,
        provider: "local",
        workspace: "/workspace",
      });

      /* The journal is fetched into the sandbox, which is what a real runner
         would do at the end of a browser run. From here on it is a file, and
         a file is something this product already knows how to score. */
      const journal = yield* Effect.promise(() =>
        fetch(`${site.url}/__journal`).then((response) => response.text())
      );

      const state = yield* Effect.promise(() =>
        fetch(`${site.url}/__state`).then((response) => response.text())
      );

      yield* sandbox.writeFile("journal.json", journal);
      yield* sandbox.writeFile("state.json", state);

      const scorer = yield* Scorer;

      const outcome = yield* scorer.score({
        commandCount: 4,
        events: [],
        modelMs: 1000,
        sandbox,
        verifyCommand: verify,
        workspace: sandbox.id,
      });

      yield* adapter.destroy(sandbox);

      return outcome;
    }).pipe(
      Effect.provide(ScorerGroundTruthLive)
    ) as Effect.Effect<TrialOutcome>
  );

const act = async (steps: readonly (readonly [string, string])[]) => {
  for (const [path, body] of steps) {
    if (body === "") {
      await fetch(`${site.url}${path}`);
    } else {
      await fetch(`${site.url}${path}`, {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      });
    }
  }
};

/* One POST to /cart/add and no more.
 *
 * Written without a pipeline on purpose. The scorer refuses to score through
 * one, because a pipeline exits with its last command and `grep | wc` would
 * report the success of wc no matter what grep found. That guard rejected an
 * earlier version of this verifier, which is the guard working. */
const ONCE_ONLY = [
  "set -e",
  /* Counted with awk rather than grep: the journal is one line, so grep -c
     counts the line and reports one however many times the agent clicked. */
  "adds=$(awk -v RS='\"path\":\"/cart/add\"' 'END{print NR-1}' journal.json)",
  'test "$adds" = "1"',
].join("\n");

const NOTHING_MUTATED = [
  "set -e",
  '! grep -q \'"method":"POST"\' journal.json',
].join("\n");

describe("a browser task scored by the product", () => {
  it("passes an agent that added the item exactly once", async () => {
    await act([
      ["/", ""],
      ["/cart/add", "name=Blue+Widget"],
    ]);

    const outcome = await scoreAgainstSite(ONCE_ONLY);

    expect(outcome.status).toBe("passed");
    expect(outcome.exitCode).toBe(0);
  });

  /** The regression the final state hides. Same cart, different verdict. */
  it("fails an agent that double clicked", async () => {
    await act([
      ["/", ""],
      ["/cart/add", "name=Blue+Widget"],
      ["/cart/add", "name=Blue+Widget"],
    ]);

    expect(site.state().cart).toHaveLength(1);

    const outcome = await scoreAgainstSite(ONCE_ONLY);

    expect(outcome.passed).toBe(false);
  });

  it("passes an agent that correctly changed nothing", async () => {
    await act([["/invoices", ""]]);

    const outcome = await scoreAgainstSite(NOTHING_MUTATED);

    expect(outcome.passed).toBe(true);
  });

  it("fails an agent that invented work", async () => {
    await act([
      ["/invoices", ""],
      ["/cart/add", "name=Blue+Widget"],
    ]);

    const outcome = await scoreAgainstSite(NOTHING_MUTATED);

    expect(outcome.passed).toBe(false);
  });

  /** A browser run that never reached the site produced no evidence, and the
   * void gate has to read that as void rather than as a failing agent. */
  it("voids when the journal is missing rather than blaming the agent", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const adapter = yield* makeLocalAdapter;

        const sandbox = yield* adapter.open({
          autoStopMinutes: 1,
          provider: "local",
          workspace: "/workspace",
        });

        const scorer = yield* Scorer;

        return yield* scorer.score({
          commandCount: 0,
          events: [],
          modelMs: 0,
          sandbox,
          verifyCommand: "cat journal.json",
          workspace: sandbox.id,
        });
      }).pipe(
        Effect.provide(ScorerGroundTruthLive)
      ) as Effect.Effect<TrialOutcome>
    );

    expect(outcome.passed).toBe(false);
  });
});
