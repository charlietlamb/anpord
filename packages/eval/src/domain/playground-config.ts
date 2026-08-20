import { Schema } from "effect";
import { HarnessName, ProviderName } from "./cell";

const SourceSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("empty") }),
  Schema.Struct({
    kind: Schema.Literal("repo"),
    ref: Schema.NullOr(Schema.String),
    url: Schema.String,
  }),
  Schema.Struct({
    files: Schema.Record({ key: Schema.String, value: Schema.String }),
    kind: Schema.Literal("files"),
  })
);

/** A row of the grid.
 *
 * `verify` is nullable so an imported case can exist here honestly. A case
 * with no verifier runs and reports and never claims a pass, rather than
 * having a verifier invented for it. */
export const PlaygroundCase = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: SourceSchema,
  verify: Schema.NullOr(Schema.String),
});

/** A column of the grid: one harness, one model, one sandbox. */
export const PlaygroundColumn = Schema.Struct({
  harness: HarnessName,
  model: Schema.String,
  provider: ProviderName,
});

/**
 * Everything a person is working on, saved between visits.
 *
 * Held as one document because it is read and written whole. Decoding it at
 * the boundary is what stops a column added next month from silently reading
 * as absent on every playground written before it.
 */
export const PlaygroundConfig = Schema.Struct({
  cases: Schema.Array(PlaygroundCase),
  columns: Schema.Array(PlaygroundColumn),
  prompt: Schema.String,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type PlaygroundConfig = typeof PlaygroundConfig.Type;

export const decodePlaygroundConfig = Schema.decodeUnknown(PlaygroundConfig);

/** A new playground has a prompt that resolves the case goal and nothing
 * else. Starting empty rather than with a fixture is deliberate: the first
 * thing a person does is describe a task, not edit code. */
export const emptyPlaygroundConfig: PlaygroundConfig = {
  cases: [],
  columns: [],
  prompt: "{{goal}}",
  trials: 3,
};

/** Whether this playground can be run, and why not.
 *
 * A calculation rather than a check inside the service: the same answer is
 * needed to disable a control and to reject a request, and two copies of it
 * would eventually disagree. */
export const readinessOf = (config: PlaygroundConfig): readonly string[] => {
  const problems: string[] = [];

  if (config.cases.length === 0) {
    problems.push("add at least one case");
  }

  if (config.columns.length === 0) {
    problems.push("add at least one column");
  }

  if (config.prompt.trim() === "") {
    problems.push("the prompt is empty");
  }

  return problems;
};

/** Cases that will run but cannot pass, because nothing decides them. Not an
 * error: an imported case is legitimately ungated, and the caller is told so
 * rather than having the fact hidden. */
export const ungatedCasesIn = (config: PlaygroundConfig): readonly string[] =>
  config.cases
    .filter((subject) => subject.verify === null)
    .map((subject) => subject.name);
