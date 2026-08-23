import { CredentialSelections } from "@anpord/schema/domain/credentials";
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

export const PlaygroundCase = Schema.Struct({
  goal: Schema.String,
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: SourceSchema,
  verify: Schema.NullOr(Schema.String),
});

export const PlaygroundColumn = Schema.Struct({
  harness: HarnessName,
  model: Schema.String,
  provider: ProviderName,
});

export const PlaygroundConfig = Schema.Struct({
  cases: Schema.Array(PlaygroundCase),
  columns: Schema.Array(PlaygroundColumn),
  connections: Schema.optionalWith(CredentialSelections, {
    default: () => ({}),
  }),
  prompt: Schema.String,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type PlaygroundConfig = typeof PlaygroundConfig.Type;

export const decodePlaygroundConfig = Schema.decodeUnknown(PlaygroundConfig);

export const emptyPlaygroundConfig: PlaygroundConfig = {
  cases: [],
  columns: [],
  connections: {},
  prompt: "{{goal}}",
  trials: 3,
};

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

export const ungatedCasesIn = (config: PlaygroundConfig): readonly string[] =>
  config.cases
    .filter((subject) => subject.verify === null)
    .map((subject) => subject.name);
