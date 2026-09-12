import { Schema } from "effect";
import { CredentialSelections } from "./credentials";
import { EvalTrigger } from "./eval-trigger";
import {
  DEFAULT_SANDBOX,
  EvalHarness,
  EvalSandbox,
  EvalSource,
  EvalVariables,
} from "./evals";

export const PlaygroundCaseView = Schema.Struct({
  name: Schema.String,
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

  verify: Schema.NullOr(Schema.String),
});

export const PlaygroundColumnView = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
  sandbox: EvalSandbox,
});

export const PlaygroundConfigView = Schema.Struct({
  cases: Schema.Array(PlaygroundCaseView),
  columns: Schema.Array(PlaygroundColumnView),
  connections: Schema.optionalWith(CredentialSelections, {
    default: () => ({}),
  }),
  prompt: Schema.String,
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});

export const EvalDraftCase = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.annotations({ message: () => "Name this case." })
  ),
  setup: Schema.NullOr(Schema.String),
  source: EvalSource,
  variables: EvalVariables.pipe(
    Schema.filter(
      (values) => Object.values(values).some((value) => value.trim() !== ""),
      { message: () => "Say what the agent should do." }
    )
  ),
  verify: Schema.NullOr(Schema.String),
});
export type EvalDraftCase = typeof EvalDraftCase.Type;

export const EvalAgent = Schema.Struct({
  harness: EvalHarness,
  model: Schema.String,
});
export type EvalAgent = typeof EvalAgent.Type;

export const EvalDraft = Schema.Struct({
  agents: Schema.mutable(Schema.Array(EvalAgent)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Choose at least one agent." })
  ),
  cases: Schema.mutable(Schema.Array(EvalDraftCase)).pipe(
    Schema.minItems(1),
    Schema.annotations({ message: () => "Add at least one case." })
  ),
  connections: CredentialSelections,
  name: Schema.String,
  prompt: Schema.String,
  /* Empty is allowed: a draft that names no sandbox runs on the default. */
  sandboxes: Schema.mutable(Schema.Array(EvalSandbox)),
  trials: Schema.Int.pipe(
    Schema.between(1, 10),
    Schema.annotations({ message: () => "Run between 1 and 10 trials." })
  ),
});
export type EvalDraft = typeof EvalDraft.Type;

export const columnsOfDraft = (draft: {
  readonly agents: readonly EvalAgent[];
  readonly sandboxes: readonly EvalSandbox[];
}): readonly {
  harness: EvalHarness;
  model: string;
  sandbox: EvalSandbox;
}[] => {
  const chosen =
    draft.sandboxes.length === 0 ? [DEFAULT_SANDBOX] : draft.sandboxes;

  return draft.agents.flatMap(({ harness, model }) =>
    chosen.map((sandbox) => ({ harness, model, sandbox }))
  );
};

export const draftOfConfig = (
  config: typeof PlaygroundConfigView.Type,
  name: string
): EvalDraft => ({
  agents: [
    ...new Map(
      config.columns.map(({ harness, model }) => [
        `${harness}\0${model}`,
        { harness, model },
      ])
    ).values(),
  ],
  cases: config.cases.map((subject) => ({
    name: subject.name,
    setup: subject.setup,
    source: subject.source,
    variables: subject.variables,
    verify: subject.verify,
  })),
  connections: config.connections,
  name,
  prompt: config.prompt,
  sandboxes: [...new Set(config.columns.map((column) => column.sandbox))],
  trials: config.trials,
});

export const PlaygroundView = Schema.Struct({
  config: PlaygroundConfigView,
  id: Schema.String,
  lastRunId: Schema.NullOr(Schema.String),
  name: Schema.String,

  problems: Schema.Array(Schema.String),

  ungated: Schema.Array(Schema.String),
  updatedAt: Schema.DateTimeUtc,
});
export type PlaygroundView = typeof PlaygroundView.Type;

export const CreatePlaygroundRequest = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
});

export const SavePlaygroundRequest = Schema.Struct({
  config: PlaygroundConfigView,
  name: Schema.String.pipe(Schema.minLength(1)),
});

export const StartedEval = Schema.Struct({ id: Schema.String }).annotations({
  description: "The id of an eval run accepted for background execution.",
  identifier: "StartedEval",
});

export const RerunCellRequest = Schema.Struct({
  trigger: Schema.optional(EvalTrigger),
  trials: Schema.Int.pipe(Schema.between(1, 10)),
});
export type RerunCellRequest = typeof RerunCellRequest.Type;
export type StartedEval = typeof StartedEval.Type;

export const CatalogueModel = Schema.Struct({
  displayName: Schema.String,
  id: Schema.String,
  summary: Schema.NullOr(Schema.String),
  vendor: Schema.NullOr(Schema.String),
}).annotations({
  description: "A model available to the installed harness.",
  identifier: "CatalogueModel",
});
export type CatalogueModel = typeof CatalogueModel.Type;

export const ModelCatalogue = Schema.Struct({
  harness: EvalHarness,
  models: Schema.Array(CatalogueModel),
  total: Schema.Int,
}).annotations({
  description: "Models available to the installed harness.",
  identifier: "ModelCatalogue",
});
export type ModelCatalogue = typeof ModelCatalogue.Type;
