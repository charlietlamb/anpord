import { Schema } from "effect";
import { CredentialBindings } from "./credentials";
import { EvalJudge } from "./eval-judges";
import {
  EvalCaseId,
  EvalCaseName,
  EvalCaseTags,
  EvalPrompt,
  EvalSuiteId,
  EvalSuiteName,
  EvalVariableValue,
  EvalVerify,
} from "./eval-limits";
import {
  MAX_START_CASES,
  MAX_START_TRIALS,
  MAX_START_VARIANTS,
} from "./eval-quota";
import { EvalSourceFiles } from "./eval-source-files";
import { EvalTrigger } from "./eval-trigger";
import { EvalUser } from "./eval-turns";
import { EvalHarness } from "./harness";
import {
  HarnessProfile,
  PROFILE_HARNESS_RULE,
  profileFitsHarness,
} from "./harness-profile";

export const EvalSandbox = Schema.Literal(
  "daytona",
  "e2b",
  "upstash",
  "modal",
  "cloudflare",
  "vercel",
  "local"
);
export type EvalSandbox = typeof EvalSandbox.Type;

export const EVAL_SANDBOXES = EvalSandbox.literals;

export const HOSTED_SANDBOXES = EVAL_SANDBOXES.filter(
  (sandbox) => sandbox !== "local"
);

export const DEFAULT_SANDBOX: EvalSandbox = "e2b";

export const EvalSource = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("empty") }),
  Schema.Struct({
    kind: Schema.Literal("repo"),
    ref: Schema.NullOr(Schema.String),
    url: Schema.String.pipe(
      Schema.minLength(1),
      Schema.annotations({ message: () => "Give the repository a URL." })
    ),
  }),
  Schema.Struct({
    files: Schema.Record({ key: Schema.String, value: Schema.String }),
    kind: Schema.Literal("files"),
  })
).annotations({
  description: "The workspace available to the harness before setup runs.",
  identifier: "EvalSource",
});
export type EvalSource = typeof EvalSource.Type;

export const EvalCodeValidator = Schema.Struct({
  capture: Schema.optional(Schema.Boolean),
  manifest: Schema.optional(
    Schema.Array(
      Schema.Struct({
        index: Schema.NonNegativeInt,
        name: Schema.String.pipe(Schema.maxLength(200)),
      })
    ).pipe(
      Schema.minItems(1),
      Schema.maxItems(20),
      Schema.filter(
        (checks) =>
          new Set(checks.map((check) => check.index)).size === checks.length,
        { message: () => "Validator indices must be unique" }
      )
    )
  ),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  source: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_000_000)),
});

export const EvalValidator = Schema.Union(
  EvalCodeValidator.pipe(
    Schema.extend(
      Schema.Struct({ sourceFiles: Schema.optional(EvalSourceFiles) })
    )
  ),
  Schema.Struct({
    kind: Schema.Literal("judged"),
    capture: Schema.optional(Schema.Boolean),
    name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
    checks: Schema.Array(EvalCodeValidator).pipe(Schema.maxItems(20)),
    judges: Schema.Array(EvalJudge).pipe(
      Schema.minItems(1),
      Schema.maxItems(20)
    ),
    sourceFiles: Schema.optional(EvalSourceFiles),
  }).pipe(
    Schema.filter(
      (validator) =>
        validator.checks.reduce(
          (total, check) => total + (check.manifest?.length ?? 1),
          0
        ) <= 20,
      { message: () => "At most 20 code validators are supported" }
    )
  )
).annotations({
  description: "A bundled TypeScript validator and its exported function name.",
  identifier: "EvalValidator",
});
export type EvalValidator = typeof EvalValidator.Type;

export const EvalPrepare = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  source: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1_000_000)),
}).annotations({
  description:
    "A bundled TypeScript workspace setup and its exported function name.",
  identifier: "EvalPrepare",
});
export type EvalPrepare = typeof EvalPrepare.Type;

export const EvalPrepareValue = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
}).annotations({
  description: "What a workspace setup returned, handed to the validator.",
  identifier: "EvalPrepareValue",
});
export type EvalPrepareValue = typeof EvalPrepareValue.Type;

export const EvalVariables = Schema.Record({
  key: Schema.String,
  value: EvalVariableValue,
}).annotations({
  description:
    "Values for the placeholders the run prompt names, such as {{task}}.",
  identifier: "EvalVariables",
});
export type EvalVariables = typeof EvalVariables.Type;

export const CaseCache = Schema.Struct({
  key: Schema.String.pipe(Schema.minLength(1)),
  path: Schema.String.pipe(
    Schema.minLength(1),
    Schema.filter(
      (value) => !(value.startsWith("/") || value.split("/").includes("..")),
      { message: () => "a cache path must stay inside the workspace" }
    ),
    Schema.filter(
      (value) => {
        const directory = value
          .split("/")
          .find((part) => part !== "" && part !== ".");
        return directory !== undefined && directory !== ".anpord";
      },
      {
        message: () =>
          "a cache must name a subdirectory outside the reserved .anpord runtime",
      }
    )
  ),
}).annotations({ identifier: "CaseCache" });
export type CaseCache = typeof CaseCache.Type;

const EvalCaseFields = {
  cache: Schema.optional(CaseCache),
  id: EvalCaseId,
  user: Schema.optionalWith(Schema.NullOr(EvalUser), { default: () => null }),
  prepare: Schema.optionalWith(Schema.NullOr(EvalPrepare), {
    default: () => null,
  }),
  source: Schema.optionalWith(EvalSource, {
    default: () => ({ kind: "empty" as const }),
  }),
  tags: Schema.optionalWith(EvalCaseTags, { default: () => [] }),
  variables: Schema.optionalWith(EvalVariables, { default: () => ({}) }),

  validator: Schema.optionalWith(Schema.NullOr(EvalValidator), {
    default: () => null,
  }),
  verify: Schema.optionalWith(Schema.NullOr(EvalVerify), {
    default: () => null,
  }),
};

export const EvalCase = Schema.transform(
  Schema.Struct({ ...EvalCaseFields, name: Schema.optional(EvalCaseName) }),
  Schema.typeSchema(Schema.Struct({ ...EvalCaseFields, name: EvalCaseName })),
  {
    decode: ({ name, ...rest }) => ({ ...rest, name: name ?? rest.id }),
    encode: (value) => value,
    strict: true,
  }
).annotations({
  description: "One eval. Its name defaults to its id.",
  identifier: "EvalCase",
});
export type EvalCase = typeof EvalCase.Type;

export const EvalVariantRequest = Schema.Struct({
  credentials: Schema.optional(CredentialBindings),
  harness: EvalHarness,
  model: Schema.String.pipe(Schema.minLength(1)),
  profile: Schema.optional(HarnessProfile),
  sandbox: Schema.optionalWith(EvalSandbox, { default: () => DEFAULT_SANDBOX }),
})
  .pipe(
    Schema.filter(profileFitsHarness, { message: () => PROFILE_HARNESS_RULE })
  )
  .annotations({
    description: `A harness and model, with an optional sandbox and an optional profile layered on the harness. ${PROFILE_HARNESS_RULE}`,
    identifier: "EvalVariantRequest",
  });
export type EvalVariantRequest = typeof EvalVariantRequest.Type;

const EvalSuiteFields = {
  id: EvalSuiteId,
  prompt: EvalPrompt,
  source: Schema.optionalWith(Schema.NullOr(EvalSource), {
    default: () => null,
  }),
};

export const EvalSuiteRequest = Schema.transform(
  Schema.Struct({ ...EvalSuiteFields, name: Schema.optional(EvalSuiteName) }),
  Schema.typeSchema(Schema.Struct({ ...EvalSuiteFields, name: EvalSuiteName })),
  {
    decode: ({ name, ...rest }) => ({ ...rest, name: name ?? rest.id }),
    encode: (value) => value,
    strict: true,
  }
).annotations({
  description:
    "The suite the cases belong to, and the prompt and workspace they share. Its name defaults to its id.",
  identifier: "EvalSuiteRequest",
});
export type EvalSuiteRequest = typeof EvalSuiteRequest.Type;

export const StartBatchRequest = Schema.Struct({
  cases: Schema.Array(EvalCase).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_CASES)
  ),
  local: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  suite: EvalSuiteRequest,
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
  trigger: Schema.optionalWith(Schema.NullOr(EvalTrigger), {
    default: () => null,
  }),
  variants: Schema.Array(EvalVariantRequest).pipe(
    Schema.minItems(1),
    Schema.maxItems(MAX_START_VARIANTS)
  ),
}).annotations({
  description:
    "Run every case of a suite on every variant, each as many times as trials.",
  identifier: "StartBatchRequest",
});
export type StartBatchRequest = typeof StartBatchRequest.Type;
