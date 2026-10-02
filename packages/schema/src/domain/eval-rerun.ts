import { Schema } from "effect";
import { DEFAULT_SANDBOX, EvalSandbox } from "./eval-definition";
import { EvalCaseId } from "./eval-limits";
import { MAX_START_TRIALS } from "./eval-quota";
import { EvalHarness } from "./eval-trial";
import { EvalSuite, EvalVariant } from "./evals";

export const HostedSandbox = EvalSandbox.pipe(
  Schema.filter(
    (sandbox): sandbox is Exclude<EvalSandbox, "local"> => sandbox !== "local",
    {
      message: () =>
        "The local sandbox runs on your machine. Start it with sphynx eval --local.",
    }
  )
).annotations({
  description: "A sandbox this service can open on the caller's behalf.",
  identifier: "HostedSandbox",
});
export type HostedSandbox = typeof HostedSandbox.Type;

export const RerunScope = Schema.Literal(
  "everyCase",
  "onlyFailures"
).annotations({
  description: "Which cases of a suite a re-run takes.",
  identifier: "RerunScope",
});
export type RerunScope = typeof RerunScope.Type;

export const RerunTarget = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("asBefore") }),
  Schema.Struct({
    harness: EvalHarness,
    kind: Schema.Literal("onVariant"),
    model: Schema.String.pipe(Schema.minLength(1)),
    sandbox: Schema.optionalWith(HostedSandbox, {
      default: () => DEFAULT_SANDBOX,
    }),
  })
).annotations({
  description:
    "Repeat each case on the variants it already ran on, or on one variant the caller names.",
  identifier: "RerunTarget",
});
export type RerunTarget = typeof RerunTarget.Type;

export const RerunIntent = Schema.Struct({
  scope: RerunScope,
  target: RerunTarget,
  trials: Schema.Int.pipe(Schema.between(1, MAX_START_TRIALS)),
}).annotations({
  description: "What the caller asked a suite to do again, without any plan.",
  identifier: "RerunIntent",
});
export type RerunIntent = typeof RerunIntent.Type;

export const RerunFingerprint = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("RerunFingerprint")
).annotations({
  description:
    "Stands for the exact slots a plan holds, so a start can refuse a plan the suite has outgrown.",
  identifier: "RerunFingerprint",
});
export type RerunFingerprint = typeof RerunFingerprint.Type;

export const PlannedVariant = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("existing"), variant: EvalVariant }),
  Schema.Struct({
    harness: EvalHarness,
    kind: Schema.Literal("fresh"),
    model: Schema.String,
    sandbox: HostedSandbox,
  })
).annotations({
  description:
    "A variant a slot runs on, either one the case already holds or one the re-run mints.",
  identifier: "PlannedVariant",
});
export type PlannedVariant = typeof PlannedVariant.Type;

export const RerunSlot = Schema.Struct({
  caseId: EvalCaseId,
  caseName: Schema.String,
  variant: PlannedVariant,
}).annotations({
  description: "One case the re-run starts, on one variant.",
  identifier: "RerunSlot",
});
export type RerunSlot = typeof RerunSlot.Type;

export const RerunSkipReason = Schema.Literal(
  "neverRun",
  "nothingFailed",
  "onlyLocal",
  "overBatchLimit"
).annotations({
  description: "Why a case of the suite is left out of the re-run.",
  identifier: "RerunSkipReason",
});
export type RerunSkipReason = typeof RerunSkipReason.Type;

export const RerunSkip = Schema.Struct({
  caseId: EvalCaseId,
  caseName: Schema.String,
  reason: RerunSkipReason,
}).annotations({
  description: "One case the re-run leaves out, and why.",
  identifier: "RerunSkip",
});
export type RerunSkip = typeof RerunSkip.Type;

export const RerunPlan = Schema.Struct({
  fingerprint: RerunFingerprint,
  skipped: Schema.Array(RerunSkip),
  slots: Schema.Array(RerunSlot),
  suite: EvalSuite,
  trials: Schema.Int,
}).annotations({
  description:
    "Everything a re-run would start and everything it would leave out, before it starts anything.",
  identifier: "RerunPlan",
});
export type RerunPlan = typeof RerunPlan.Type;

export const RerunRequest = Schema.extend(
  RerunIntent,
  Schema.Struct({ expect: Schema.NullOr(RerunFingerprint) })
).annotations({
  description:
    "An intent to start, with the fingerprint of the plan the caller was shown, or null to start whatever the plan says now.",
  identifier: "RerunRequest",
});
export type RerunRequest = typeof RerunRequest.Type;
