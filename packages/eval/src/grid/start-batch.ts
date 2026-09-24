import type { Actor } from "@anpord/schema/domain/actor";
import { authorIdOf } from "@anpord/schema/domain/actor";
import {
  MAX_ORGANIZATION_RUNS_IN_FLIGHT,
  MAX_RUN_TRIALS,
  trialsRequested,
} from "@anpord/schema/domain/eval-quota";
import type {
  EvalVariantRequest,
  StartBatchRequest,
  StartedBatch,
} from "@anpord/schema/domain/evals";
import { Effect, Option } from "effect";
import { modelAccessFor } from "../credentials/model-key";
import { CredentialResolver } from "../credentials/resolver";
import { bindCredentials } from "../credentials/variants";
import { definitionHashOf } from "../domain/case-identity";
import { StartRefused } from "../domain/errors";
import { profileOfRequest } from "../domain/harness-profile";
import { profileVersionOf } from "../domain/profile-identity";
import { renderPrompt } from "../domain/prompt";
import { userModel, userModelOf } from "../domain/variant";
import { BatchRepository } from "../repositories/batch-repository";
import { CatalogRepository } from "../repositories/catalog-repository";
import { HarnessProfileRepository } from "../repositories/harness-profile-repository";
import { HarnessVersions } from "../services/harness-versions";
import type { Launch } from "./launch";

const variantKey = (variant: EvalVariantRequest) =>
  [
    variant.harness,
    variant.model,
    variant.sandbox,
    variant.profile?.name ?? "",
  ].join("\u0000");

const admit = (actor: Actor, request: StartBatchRequest) =>
  Effect.gen(function* () {
    const keys = request.variants.map(variantKey);
    if (new Set(keys).size !== keys.length) {
      return yield* new StartRefused({
        reason: "Each variant must be different.",
        retryable: false,
      });
    }

    const requested = trialsRequested({
      cases: request.cases.length,
      trials: request.trials,
      variants: request.variants.length,
    });
    if (requested > MAX_RUN_TRIALS) {
      return yield* new StartRefused({
        reason: `A batch may contain at most ${MAX_RUN_TRIALS} trials, and this one asks for ${requested}.`,
        retryable: false,
      });
    }

    if (request.cases.some((subject) => subject.user?.kind === "simulated")) {
      const access = yield* modelAccessFor(
        yield* CredentialResolver,
        actor.organizationId
      );
      if (Option.isNone(access)) {
        return yield* new StartRefused({
          reason:
            "A case states a human, which needs a model to play them. Connect one under settings, models.",
          retryable: false,
        });
      }
    }

    const inFlight = yield* (yield* BatchRepository)
      .inFlight(actor.organizationId)
      .pipe(Effect.orDie);
    if (inFlight >= MAX_ORGANIZATION_RUNS_IN_FLIGHT) {
      return yield* new StartRefused({
        reason: `This organization already has ${inFlight} batches going, and may have ${MAX_ORGANIZATION_RUNS_IN_FLIGHT} at once. Wait for one to finish.`,
        retryable: true,
      });
    }
  });

export const makeStartBatch = (
  launch: (input: Launch) => Effect.Effect<{
    readonly internalId: string;
    readonly runInternalIds: readonly string[];
  }, unknown>
) =>
  Effect.gen(function* () {
    const catalog = yield* CatalogRepository;
    const credentials = yield* CredentialResolver;
    const profiles = yield* HarnessProfileRepository;
    const versions = yield* HarnessVersions;
    const batches = yield* BatchRepository;

    const admitted = (actor: Actor, request: StartBatchRequest) =>
      admit(actor, request).pipe(
        Effect.provideService(CredentialResolver, credentials),
        Effect.provideService(BatchRepository, batches)
      );

    return (actor: Actor, request: StartBatchRequest) =>
      Effect.gen(function* () {
        yield* admitted(actor, request);

        const conductedBy = yield* userModel;
        const bound = yield* bindCredentials(
          credentials,
          actor,
          request.variants
        );
        const harnessVersions = yield* Effect.forEach(
          request.variants,
          (variant) => versions.version(variant.harness)
        );
        const profileRows = yield* Effect.forEach(
          request.variants,
          (variant) => {
            const profile = profileOfRequest(variant.profile);
            return profile === null
              ? Effect.succeed(null)
              : profiles.insertIfAbsent({
                  ...profile,
                  base: variant.harness,
                  organizationId: actor.organizationId,
                  version: profileVersionOf(profile),
                }).pipe(Effect.orDie);
          },
          { concurrency: 4 }
        );

        const cases = request.cases.map((subject) => {
          const definition = {
            cache: subject.cache ?? null,
            prepare: subject.prepare,
            prompt: renderPrompt(request.suite.prompt, subject.variables),
            source: subject.source,
            user: subject.user,
            validator: subject.validator,
            verify: subject.verify,
          };
          return {
            ...definition,
            definitionHash: definitionHashOf(definition),
            id: subject.id,
            name: subject.name,
            tags: subject.tags,
            variants: request.variants.map((variant) => ({
              harness: variant.harness,
              model: variant.model,
              profile: variant.profile?.name ?? null,
              sandbox: variant.sandbox,
              userModel: userModelOf(subject.user, conductedBy),
            })),
          };
        });

        const registered = yield* catalog
          .register({
            cases,
            createdBy: authorIdOf(actor),
            organizationId: actor.organizationId,
            suite: request.suite,
          })
          .pipe(Effect.orDie);

        const slots = registered.flatMap((subject, caseIndex) =>
          subject.variantInternalIds.map((variantInternalId, variantIndex) => ({
            caseId: request.cases[caseIndex]?.id ?? "",
            run: {
              ...(bound[variantIndex] ?? {
                harnessCredentialConnectionId: null,
                harnessCredentialRevision: null,
                sandboxCredentialConnectionId: null,
                sandboxCredentialRevision: null,
              }),
              caseVersionInternalId: subject.caseVersionInternalId,
              harnessVersion: harnessVersions[variantIndex] ?? "unknown",
              profileInternalId: profileRows[variantIndex]?.internalId ?? null,
              trialCount: request.trials,
              variantInternalId,
            },
            variantIndex,
          }))
        );

        const created = yield* launch({
          local: request.local,
          organizationId: actor.organizationId,
          runs: slots.map((slot) => slot.run),
          startedBy: authorIdOf(actor),
          trigger: request.trigger ?? { source: "api" },
        }).pipe(Effect.orDie);

        return {
          id: created.internalId,
          runs: slots.map((slot, index) => ({
            caseId: slot.caseId,
            id: created.runInternalIds[index] ?? "",
            variantIndex: slot.variantIndex,
          })),
        } satisfies StartedBatch;
      }).pipe(
        Effect.withSpan("Batches.start", {
          attributes: {
            cases: request.cases.length,
            suite: request.suite.id,
            trials: request.trials,
            variants: request.variants.length,
          },
        }),
        Effect.annotateLogs({ organizationId: actor.organizationId })
      );
  });
