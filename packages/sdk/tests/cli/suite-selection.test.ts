import { describe, expect, test } from "bun:test";
import { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import { EvalCaseId } from "@sphynx/schema/domain/eval-limits";
import { Effect, Either, Option, Schema } from "effect";
import { selectFrom } from "../../src/cli/suite-selection";

const request = Schema.decodeUnknownSync(StartBatchRequest)({
  cases: [
    { id: "adds-a-test", name: "adds a test" },
    { id: "fixes-a-bug", name: "fixes a bug" },
  ],
  suite: { id: "smoke", name: "smoke", prompt: "Do it" },
  trials: 1,
  variants: [
    { harness: "codex", model: "gpt-5.6-sol" },
    { harness: "claude", model: "claude-opus-5" },
  ],
});

const select = (caseId: string | null, variants: readonly string[]) =>
  Effect.runSync(
    Effect.either(
      selectFrom("smoke.eval.ts", request, {
        caseId: Option.map(Option.fromNullable(caseId), EvalCaseId.make),
        variants,
      })
    )
  );

describe("picking cases and variants from a suite file", () => {
  test("keeps everything when nothing is named", () => {
    const picked = Either.getOrThrow(select(null, []));
    expect(picked.cases).toHaveLength(2);
    expect(picked.variants).toHaveLength(2);
  });

  test("keeps the named case on the named variants", () => {
    const picked = Either.getOrThrow(
      select("fixes-a-bug", ["claude/claude-opus-5"])
    );
    expect(picked.cases.map((subject) => subject.id)).toEqual(["fixes-a-bug"]);
    expect(picked.variants.map((variant) => variant.harness)).toEqual([
      "claude",
    ]);
  });

  test("names what the file has when a case is not in it", () => {
    const refused = select("missing", []);
    expect(Either.isLeft(refused)).toBe(true);
    expect(Either.getLeft(refused).pipe(Option.getOrThrow).message).toBe(
      "smoke.eval.ts has no case missing. It has adds-a-test, fixes-a-bug."
    );
  });

  test("refuses a variant the file does not run", () => {
    const refused = select(null, ["codex/gpt-5.6-terra"]);
    expect(Either.getLeft(refused).pipe(Option.getOrThrow).message).toContain(
      "codex/gpt-5.6-sol, claude/claude-opus-5"
    );
  });
});

describe("naming a variant that carries a profile", () => {
  const profiled = Schema.decodeUnknownSync(StartBatchRequest)({
    ...request,
    variants: [
      {
        harness: "command",
        model: "probe-a",
        profile: { files: {}, name: "probe", run: "./agent.sh" },
      },
      {
        harness: "command",
        model: "probe-b",
        profile: { files: {}, name: "probe", run: "./agent.sh" },
      },
    ],
  });

  const pick = (variants: readonly string[]) =>
    Effect.runSync(
      selectFrom("probe.eval.ts", profiled, {
        caseId: Option.none(),
        variants,
      })
    ).variants.map((variant) => variant.model);

  test("finds it by harness and model alone", () => {
    expect(pick(["command/probe-b"])).toEqual(["probe-b"]);
  });

  test("finds it by its full label too", () => {
    expect(pick(["command/probe-a@probe"])).toEqual(["probe-a"]);
  });

  test("names every match when a profile is on more than one variant", () => {
    const refused = Effect.runSync(
      Effect.either(
        selectFrom("probe.eval.ts", profiled, {
          caseId: Option.none(),
          variants: ["probe"],
        })
      )
    );

    expect(Either.getLeft(refused).pipe(Option.getOrThrow).message).toBe(
      "probe matches 2 variants in probe.eval.ts: command/probe-a@probe, command/probe-b@probe. Name one of them."
    );
  });
});

describe("telling a profile variant from a bare one on the same model", () => {
  const paired = Schema.decodeUnknownSync(StartBatchRequest)({
    ...request,
    variants: [
      {
        harness: "codex",
        model: "luna",
        profile: { files: {}, name: "autumn-setup" },
      },
      { harness: "codex", model: "luna" },
    ],
  });

  const pick = (variants: readonly string[]) =>
    Effect.runSync(
      selectFrom("paired.eval.ts", paired, {
        caseId: Option.none(),
        variants,
      })
    ).variants.map((variant) => variant.profile?.name ?? "bare");

  test("harness/model picks the bare variant alone", () => {
    expect(pick(["codex/luna"])).toEqual(["bare"]);
  });

  test("harness/model@profile picks the profile variant alone", () => {
    expect(pick(["codex/luna@autumn-setup"])).toEqual(["autumn-setup"]);
  });

  test("the profile name alone picks it too", () => {
    expect(pick(["autumn-setup"])).toEqual(["autumn-setup"]);
  });

  test("naming both keeps the suite order", () => {
    expect(pick(["codex/luna", "autumn-setup"])).toEqual([
      "autumn-setup",
      "bare",
    ]);
  });

  test("lists every label when nothing matches", () => {
    const refused = Effect.runSync(
      Effect.either(
        selectFrom("paired.eval.ts", paired, {
          caseId: Option.none(),
          variants: ["codex/sol"],
        })
      )
    );

    expect(Either.getLeft(refused).pipe(Option.getOrThrow).message).toBe(
      "paired.eval.ts has no variant codex/sol. It has codex/luna@autumn-setup, codex/luna."
    );
  });
});
