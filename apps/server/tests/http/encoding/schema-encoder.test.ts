import { describe, expect, it } from "bun:test";
import { EvalCosts } from "@anpord/schema/domain/eval-costs";
import { EvalJournalEntry } from "@anpord/schema/domain/eval-trial";
import { EvalValidations } from "@anpord/schema/domain/eval-validations";
import { EvalBatch } from "@anpord/schema/domain/evals";
import { Arbitrary, DateTime, FastCheck, Option, Schema } from "effect";
import { schemaEncoder } from "../../../src/http/encoding/schema-encoder";

const costs = {
  allocatedUsd: 0,
  estimatedEquivalentUsd: 0,
  incomplete: true,
  knownActualUsd: 0,
  components: [
    {
      classification: "unknown",
      component: "harness",
      detail: { harness: "command", durationMs: 31_474 },
      explanation: "The harness cannot be priced.",
      source: "connection",
      usd: null,
    },
  ],
  laterComponents: [],
};

const usage = {
  cacheReadTokens: 977,
  cacheWriteTokens: 16,
  costUsd: 0.005_417_5,
  inputTokens: 2574,
  outputTokens: 220,
  totalTokens: 2794,
};

const stamp = "2026-09-27T04:15:36.053Z";

const trial = {
  artifacts: [],
  commands: 1,
  costs,
  exitCode: 1,
  failedCommands: 1,
  failure: null,
  filesChanged: ["src/the.ts"],
  id: "trl_7A3E4R17DPWPZ0WYFVG0D1DY",
  modelMs: 31_474,
  ordinal: 1,
  sandboxId: "sandbox-1",
  sandboxMs: 2188,
  status: "failed",
  timed: true,
  trajectory: [
    {
      _tag: "message",
      finishedAtMillis: 1_788_241_461_613,
      role: "assistant",
      text: "done",
      usage,
    },
  ],
  usage,
  validations: [],
  verifySteps: [],
  voidFields: [],
};

const storedBatch = {
  costs,
  failure: null,
  finishedAt: stamp,
  id: "bat_31ERCBABFPEWJQK6YMQR0E96",
  local: true,
  runs: [
    {
      batchId: "bat_31ERCBABFPEWJQK6YMQR0E96",
      case: { id: "c1", name: "c1" },
      costs,
      definitionHash: "9696ed609f5ce5859ec3b33af187fc89",
      distribution: {
        commandMax: 1,
        commandMedian: 1,
        commandMin: 1,
        deterministic: true,
        failed: 1,
        passRate: 0,
        passed: 0,
        scored: 1,
        trials: 1,
        voided: 0,
      },
      finishedAt: stamp,
      harnessVersion: "profile",
      id: "run_062W5BX4A2CMP1JYRFB5KS1X",
      local: true,
      profileVersion: null,
      setup: {
        prepare: null,
        prompt: "Write hello.txt",
        source: { kind: "empty" },
        validator: null,
        verify: "test -f hello.txt",
      },
      startedAt: stamp,
      status: "finished",
      suite: { id: "s1", name: "s1" },
      trials: [trial],
      trigger: { source: "cli" },
      variant: {
        harness: "command",
        id: "evar_QQNJ6ST42J74AA1QHYAD01ZK",
        model: "model-0",
        profile: null,
        sandbox: "local",
        userModel: null,
      },
    },
  ],
  startedAt: stamp,
  status: "finished",
  trigger: { source: "cli" },
};

const Journal = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal("command"), exitCode: Schema.Int }),
  Schema.Struct({
    _tag: Schema.Literal("message"),
    role: Schema.optionalWith(Schema.Literal("assistant", "user"), {
      default: () => "assistant" as const,
    }),
  })
);

const Trial = Schema.Struct({
  at: Schema.DateTimeUtc,
  entries: Schema.Array(Journal),
  labels: Schema.Record({ key: Schema.String, value: Schema.Number }),
  note: Schema.optional(Schema.String),
});

const at = DateTime.unsafeMake(Date.UTC(2026, 8, 27, 4, 30));

const bytesOf = <I>(encoded: Option.Option<I>) =>
  JSON.stringify(Option.getOrThrow(encoded));

const sameAsSchemaEncode = <A, I>(
  schema: Schema.Schema<A, I>,
  values: readonly A[]
) => {
  const encode = schemaEncoder(schema);
  const reference = Schema.encodeSync(schema);
  for (const value of values) {
    expect(bytesOf(encode(value))).toBe(JSON.stringify(reference(value)));
  }
};

describe("schemaEncoder", () => {
  it("encodes timestamps, keeps declared keys, and picks the tagged member", () => {
    const encode = schemaEncoder(Trial);
    const value = {
      at,
      entries: [
        { _tag: "command" as const, exitCode: 2, stray: "dropped" },
        { _tag: "message" as const, role: "user" as const },
      ],
      internal: "never sent",
      labels: { passed: 3 },
    };
    expect(encode(value)).toEqual(
      Option.some({
        at: "2026-09-27T04:30:00.000Z",
        entries: [
          { _tag: "command", exitCode: 2 },
          { _tag: "message", role: "user" },
        ],
        labels: { passed: 3 },
      })
    );
  });

  it("gives up on a value the schema would refuse, so the builder reports it", () => {
    const encode = schemaEncoder(Trial);
    const refused = {
      at,
      entries: [{ _tag: "command" as const, exitCode: 1.5 }],
      labels: {},
    };
    expect(encode(refused)).toEqual(Option.none());
  });

  it("leaves an empty struct to Schema.encode, which keeps what it was given", () => {
    const encode = schemaEncoder(Schema.Struct({}));
    expect(encode({ kept: 1 } as never)).toEqual(Option.none());
  });

  it("checks a struct filter against the stripped value, as Schema.encode does", () => {
    const Tagged = Schema.Struct({ a: Schema.Number }).pipe(
      Schema.filter(
        (value) => (value as { extra?: number }).extra !== undefined
      )
    );
    const input = { a: 1, extra: 1 };
    expect(Schema.encodeEither(Tagged)(input)._tag).toBe("Left");
    expect(schemaEncoder(Tagged)(input)).toEqual(Option.none());
  });

  it("runs each filter of a plain struct once per encode", () => {
    const seen: string[] = [];
    const Checked = Schema.Struct({ a: Schema.Number }).pipe(
      Schema.filter(() => {
        seen.push("inner");
        return true;
      }),
      Schema.filter(() => {
        seen.push("outer");
        return true;
      })
    );
    expect(schemaEncoder(Checked)({ a: 1 })).toEqual(Option.some({ a: 1 }));
    expect(seen).toEqual(["inner", "outer"]);
  });

  it("writes a stored batch back out exactly as it was read", () => {
    const encode = schemaEncoder(EvalBatch);
    const decoded = Schema.decodeUnknownSync(EvalBatch)(storedBatch);
    expect(bytesOf(encode(decoded))).toBe(JSON.stringify(storedBatch));
    sameAsSchemaEncode(EvalBatch, [decoded]);
  });

  it("agrees with Schema.encode on generated journals, costs and validations", () => {
    const sample = <A, I>(schema: Schema.Schema<A, I>) =>
      FastCheck.sample(Arbitrary.make(schema), { numRuns: 60, seed: 7 });
    sameAsSchemaEncode(EvalJournalEntry, sample(EvalJournalEntry));
    sameAsSchemaEncode(EvalCosts, sample(EvalCosts));
    sameAsSchemaEncode(EvalValidations, sample(EvalValidations));
  });
});
