import { describe, expect, it } from "bun:test";
import { EvalCosts } from "@anpord/schema/domain/eval-costs";
import { EvalJournalEntry } from "@anpord/schema/domain/eval-trial";
import { EvalValidations } from "@anpord/schema/domain/eval-validations";
import { EvalBatch } from "@anpord/schema/domain/evals";
import { Arbitrary, DateTime, FastCheck, Option, Schema } from "effect";
import { schemaEncoder } from "../../../src/http/encoding/schema-encoder";
import batch from "./fixtures/batch.json" with { type: "json" };

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
    const decoded = Schema.decodeUnknownSync(EvalBatch)(batch);
    expect(bytesOf(encode(decoded))).toBe(JSON.stringify(batch));
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
