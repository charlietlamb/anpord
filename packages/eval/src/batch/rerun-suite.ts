import type { Actor } from "@sphynx/schema/domain/actor";
import { authorIdOf } from "@sphynx/schema/domain/actor";
import { MAX_ORGANIZATION_RUNS_IN_FLIGHT } from "@sphynx/schema/domain/eval-quota";
import type {
  PlannedVariant,
  RerunRequest,
  RerunSlot,
} from "@sphynx/schema/domain/eval-rerun";
import type { EvalTrigger } from "@sphynx/schema/domain/eval-trigger";
import type { StartedBatch } from "@sphynx/schema/domain/evals";
import { Effect } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import { bindCredentials } from "../credentials/variants";
import type { EvalNotFound } from "../domain/errors";
import { StartRefused } from "../domain/errors";
import type { RunTemplate } from "../domain/run-template";
import { BatchRepository } from "../repositories/batch-repository";
import { CatalogRepository } from "../repositories/catalog-repository";
import type { SuiteRerunCase } from "../repositories/suite-rerun-query";
import { HarnessVersions } from "../services/harness-versions";
import { refuseWhenBusy } from "./in-flight";
import { keyless, type Launch, type Launched } from "./launch";
import type { PlannedRerun, RerunPlanInput } from "./rerun-plan";

export interface RerunSuite {
  readonly actor: Actor;
  readonly request: RerunRequest;
  readonly suiteId: string;
  readonly trigger: EvalTrigger;
}

interface ResolvedSlot {
  readonly caseId: string;
  readonly caseVersionInternalId: string;
  readonly harness: RunTemplate["harness"];
  readonly sandbox: RunTemplate["sandbox"];
  readonly template: RunTemplate | null;
  readonly variantInternalId: string;
}

const NO_CREDENTIALS = {
  harnessCredentialRef: null,
  harnessCredentialRevision: null,
  sandboxCredentialRef: null,
  sandboxCredentialRevision: null,
};

const freshKey = (caseId: string, variant: PlannedVariant) =>
  variant.kind === "fresh"
    ? [caseId, variant.harness, variant.model, variant.sandbox].join("\u0000")
    : "";

const identityOf = (variant: PlannedVariant) =>
  variant.kind === "existing"
    ? { harness: variant.variant.harness, sandbox: variant.variant.sandbox }
    : { harness: variant.harness, sandbox: variant.sandbox };

const freshVariantsOf = (
  subject: SuiteRerunCase,
  slots: readonly RerunSlot[]
) =>
  slots.flatMap((slot) =>
    slot.caseId === subject.candidate.caseId && slot.variant.kind === "fresh"
      ? [slot.variant]
      : []
  );

export const makeRerunSuite = (
  planned: (input: RerunPlanInput) => Effect.Effect<PlannedRerun, EvalNotFound>,
  launch: (input: Launch) => Effect.Effect<Launched, unknown>
) =>
  Effect.gen(function* () {
    const batches = yield* BatchRepository;
    const catalog = yield* CatalogRepository;
    const credentials = yield* CredentialResolver;
    const versions = yield* HarnessVersions;

    return (input: RerunSuite) =>
      Effect.gen(function* () {
        const { plan, rows } = yield* planned({
          actor: input.actor,
          intent: input.request,
          suiteId: input.suiteId,
        });

        if (
          input.request.expect !== null &&
          input.request.expect !== plan.fingerprint
        ) {
          return yield* new StartRefused({
            reason:
              "This suite changed while you were choosing. Check the preview again.",
            retryable: true,
          });
        }

        if (plan.slots.length === 0) {
          return yield* new StartRefused({
            reason: "Nothing in this suite matches what you picked.",
            retryable: false,
          });
        }

        yield* refuseWhenBusy(input.actor.organizationId).pipe(
          Effect.provideService(BatchRepository, batches)
        );

        const minting = rows.cases
          .map((subject) => ({
            subject,
            variants: freshVariantsOf(subject, plan.slots),
          }))
          .filter((entry) => entry.variants.length > 0);

        const mintedIds = yield* Effect.forEach(
          minting,
          (entry) =>
            catalog
              .registerVariants({
                caseInternalId: entry.subject.caseInternalId,
                organizationId: input.actor.organizationId,
                variants: entry.variants.map((variant) => ({
                  harness: variant.harness,
                  model: variant.model,
                  profile: null,
                  sandbox: variant.sandbox,
                  userModel: entry.subject.userModel,
                })),
              })
              .pipe(Effect.orDie),
          { concurrency: 4 }
        );

        const minted = new Map(
          minting.flatMap((entry, index) =>
            entry.variants.map(
              (variant, position) =>
                [
                  freshKey(entry.subject.candidate.caseId, variant),
                  mintedIds[index]?.[position] ?? "",
                ] as const
            )
          )
        );
        const byCaseId = new Map(
          rows.cases.map((subject) => [subject.candidate.caseId, subject])
        );

        const resolved = yield* Effect.forEach(plan.slots, (slot) => {
          const subject = byCaseId.get(slot.caseId);
          const caseVersionInternalId =
            subject?.candidate.caseVersionInternalId ?? null;
          if (subject === undefined || caseVersionInternalId === null) {
            return Effect.dieMessage(
              `the plan named ${slot.caseId}, which has no version to run`
            );
          }

          const variantInternalId =
            slot.variant.kind === "existing"
              ? slot.variant.variant.id
              : (minted.get(freshKey(slot.caseId, slot.variant)) ?? "");

          return Effect.succeed({
            ...identityOf(slot.variant),
            caseId: slot.caseId,
            caseVersionInternalId,
            template: subject.templates.get(variantInternalId) ?? null,
            variantInternalId,
          } satisfies ResolvedSlot);
        });

        const harnessVersions = yield* Effect.forEach(resolved, (slot) =>
          slot.template === null
            ? versions.version(slot.harness)
            : Effect.succeed(slot.template.harnessVersion)
        );
        const bound = yield* bindCredentials(
          credentials,
          input.actor,
          resolved.map((slot) => ({
            credentials: {
              harnessRef: slot.template?.harnessCredentialRef ?? undefined,
              sandboxRef: slot.template?.sandboxCredentialRef ?? undefined,
            },
            harness: slot.harness,
            sandbox: slot.sandbox,
          }))
        );

        const launched = yield* launch({
          checksIn: false,
          idempotency: null,
          limit: MAX_ORGANIZATION_RUNS_IN_FLIGHT,
          local: false,
          organizationId: input.actor.organizationId,
          runs: resolved.map((slot, index) => ({
            ...(bound[index] ?? NO_CREDENTIALS),
            caseVersionInternalId: slot.caseVersionInternalId,
            harnessVersion: harnessVersions[index] ?? "unknown",
            profileInternalId: slot.template?.profileInternalId ?? null,
            trialCount: plan.trials,
            variantInternalId: slot.variantInternalId,
          })),
          startedBy: authorIdOf(input.actor),
          trigger: input.trigger,
        }).pipe(Effect.orDie, Effect.flatMap(keyless));

        return {
          id: launched.internalId,
          runs: resolved.map((slot, index) => ({
            caseId: slot.caseId,
            id: launched.runInternalIds[index] ?? "",
            variantId: slot.variantInternalId,
          })),
        } satisfies StartedBatch;
      }).pipe(
        Effect.withSpan("Batches.rerunSuite", {
          attributes: { suiteId: input.suiteId, trials: input.request.trials },
        }),
        Effect.annotateLogs({ organizationId: input.actor.organizationId })
      );
  });
