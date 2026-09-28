import type { Actor } from "@anpord/schema/domain/actor";
import { authorIdOf } from "@anpord/schema/domain/actor";
import type {
  EvalVariantRequest,
  StartBatchRequest,
} from "@anpord/schema/domain/eval-definition";
import {
  MAX_RUN_TRIALS,
  trialsRequested,
} from "@anpord/schema/domain/eval-quota";
import type { StartedBatch } from "@anpord/schema/domain/evals";
import type { IdempotencyKey } from "@anpord/schema/public/runner-api";
import { Effect, Option } from "effect";
import { modelAccessFor } from "../credentials/model-key";
import { CredentialResolver } from "../credentials/resolver";
import { bindCredentials } from "../credentials/variants";
import { caseDefinitionOf } from "../domain/case-definition";
import { definitionHashOf } from "../domain/case-identity";
import { StartRefused } from "../domain/errors";
import { profileOfRequest } from "../domain/harness-profile";
import { profileVersionOf } from "../domain/profile-identity";
import { startRequestHashOf } from "../domain/start-request-hash";
import { userHarness } from "../domain/suite-harnesses";
import { userModel, userModelOf, userModelRoute } from "../domain/variant";
import {
  BatchRepository,
  type StartKey,
} from "../repositories/batch-repository";
import { CatalogRepository } from "../repositories/catalog-repository";
import { HarnessProfileRepository } from "../repositories/harness-profile-repository";
import { startedBatchQuery } from "../repositories/started-batch-query";
import { HarnessVersions } from "../services/harness-versions";
import { refuseWhenBusy } from "./in-flight";
import type { Launch, Launched } from "./launch";

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

    for (const harness of new Set(request.cases.flatMap(userHarness))) {
      const connection = yield* (yield* CredentialResolver)
        .resolve({ actor, integrationId: harness })
        .pipe(Effect.option);
      if (Option.isNone(connection)) {
        return yield* new StartRefused({
          reason: `A case asks ${harness} to play the human, and this organization has no ${harness} connection. Connect one under settings.`,
          retryable: false,
        });
      }
    }
    if (
      request.cases.some(
        (subject) =>
          subject.user?.kind === "simulated" &&
          userHarness(subject).length === 0
      )
    ) {
      const access = yield* modelAccessFor(
        yield* CredentialResolver,
        actor.organizationId,
        userModelRoute(yield* userModel).providerId
      );
      if (Option.isNone(access)) {
        return yield* new StartRefused({
          reason:
            "A case states a human, which needs a model to play them. Connect one under settings, models.",
          retryable: false,
        });
      }
    }

    yield* refuseWhenBusy(actor.organizationId);
  });

export interface Start {
  readonly replayed: boolean;
  readonly started: StartedBatch;
}

export const makeStartBatch = (
  launch: (input: Launch) => Effect.Effect<Launched, unknown>
) =>
  Effect.gen(function* () {
    const catalog = yield* CatalogRepository;
    const credentials = yield* CredentialResolver;
    const profiles = yield* HarnessProfileRepository;
    const versions = yield* HarnessVersions;
    const batches = yield* BatchRepository;
    const startedWith = yield* startedBatchQuery;

    const earlier = (actor: Actor, keyed: StartKey | null) =>
      Effect.gen(function* () {
        if (keyed === null) {
          return Option.none<StartedBatch>();
        }
        const found = yield* startedWith(actor.organizationId, keyed.key).pipe(
          Effect.orDie
        );
        if (Option.isNone(found)) {
          return Option.none<StartedBatch>();
        }
        const { requestHash, started } = found.value;
        if (requestHash !== null && requestHash !== keyed.requestHash) {
          return yield* new StartRefused({
            reason:
              "This idempotency key already started a different run. Send a new key to start this one.",
            retryable: false,
          });
        }
        return Option.some(started);
      });

    const admitted = (actor: Actor, request: StartBatchRequest) =>
      admit(actor, request).pipe(
        Effect.provideService(CredentialResolver, credentials),
        Effect.provideService(BatchRepository, batches)
      );

    return (
      actor: Actor,
      request: StartBatchRequest,
      idempotencyKey: IdempotencyKey | null
    ) =>
      Effect.gen(function* () {
        const keyed =
          idempotencyKey === null
            ? null
            : {
                key: idempotencyKey,
                requestHash: startRequestHashOf(request),
              };
        const replay = yield* earlier(actor, keyed);
        if (Option.isSome(replay)) {
          return { replayed: true, started: replay.value } satisfies Start;
        }

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
              : profiles
                  .insertIfAbsent({
                    ...profile,
                    base: variant.harness,
                    organizationId: actor.organizationId,
                    version: profileVersionOf(profile),
                  })
                  .pipe(Effect.orDie);
          },
          { concurrency: 4 }
        );

        const cases = request.cases.map((subject) => {
          const definition = caseDefinitionOf(request.suite, subject);
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
          }))
        );

        const launched = yield* launch({
          checksIn: request.checksIn,
          idempotency: keyed,
          local: request.local,
          organizationId: actor.organizationId,
          runs: slots.map((slot) => slot.run),
          startedBy: authorIdOf(actor),
          trigger: request.trigger ?? { source: "api" },
        }).pipe(Effect.orDie);
        if (Option.isNone(launched)) {
          const raced = yield* earlier(actor, keyed);
          if (Option.isNone(raced)) {
            return yield* Effect.dieMessage(
              "the start lost a race for its key, and no batch holds that key"
            );
          }
          return { replayed: true, started: raced.value } satisfies Start;
        }

        const created = launched.value;
        return {
          replayed: false,
          started: {
            id: created.internalId,
            runs: slots.map((slot, index) => ({
              caseId: slot.caseId,
              id: created.runInternalIds[index] ?? "",
              variantId: slot.run.variantInternalId,
            })),
          },
        } satisfies Start;
      }).pipe(
        Effect.withSpan("Batches.start", {
          attributes: {
            cases: request.cases.length,
            keyed: idempotencyKey !== null,
            suite: request.suite.id,
            trials: request.trials,
            variants: request.variants.length,
          },
        }),
        Effect.annotateLogs({ organizationId: actor.organizationId })
      );
  });
