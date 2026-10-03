import { IdGenerator } from "@sphynx/ids/id";
import type { Actor } from "@sphynx/schema/domain/actor";
import type {
  AddVariables,
  EnvironmentVariable,
  UpdateVariable,
} from "@sphynx/schema/domain/environment";
import { Clock, Context, Effect, Layer } from "effect";
import { CredentialCipher } from "../credentials/cipher";
import { CredentialError } from "../credentials/errors";
import { sealVariable } from "./variable-payload";
import {
  ownerOf,
  VariableRepository,
  VariableRepositoryLive,
} from "./variable-repository";
import { previewOf, summaryOfVariable } from "./variable-row";

export interface EnvironmentVariablesShape {
  readonly add: (
    actor: Actor,
    input: AddVariables
  ) => Effect.Effect<readonly EnvironmentVariable[], CredentialError>;
  readonly list: (
    actor: Actor
  ) => Effect.Effect<readonly EnvironmentVariable[], CredentialError>;
  readonly remove: (
    actor: Actor,
    id: string
  ) => Effect.Effect<void, CredentialError>;
  readonly update: (
    actor: Actor,
    id: string,
    change: UpdateVariable
  ) => Effect.Effect<EnvironmentVariable, CredentialError>;
}

export class EnvironmentVariables extends Context.Tag(
  "@sphynx/eval/EnvironmentVariables"
)<EnvironmentVariables, EnvironmentVariablesShape>() {}

const personalNeedsAPerson = (actor: Actor, scope: string) =>
  scope === "personal" && !actor.isUser
    ? Effect.fail(
        new CredentialError({
          message: "API keys cannot own personal variables",
        })
      )
    : Effect.void;

const repeatedName = (names: readonly string[]) =>
  names.find((name, index) => names.indexOf(name) !== index);

export const EnvironmentVariablesLive = Layer.effect(
  EnvironmentVariables,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const ids = yield* IdGenerator;
    const repository = yield* VariableRepository;

    const now = Clock.currentTimeMillis.pipe(Effect.map((ms) => new Date(ms)));

    const add = (actor: Actor, input: AddVariables) =>
      Effect.gen(function* () {
        yield* personalNeedsAPerson(actor, input.scope);
        const repeated = repeatedName(input.variables.map(({ name }) => name));
        if (repeated !== undefined) {
          return yield* new CredentialError({
            message: `${repeated} is listed twice`,
          });
        }

        const owner = ownerOf(actor);
        const at = yield* now;
        const existing = (yield* repository.named(
          owner,
          input.variables.map(({ name }) => name)
        )).filter((row) => row.scope === input.scope);

        const replaced = yield* Effect.forEach(input.variables, (variable) => {
          const row = existing.find(({ name }) => name === variable.name);
          if (row === undefined) {
            return Effect.succeed(undefined);
          }
          return sealVariable(cipher, variable.value, row).pipe(
            Effect.flatMap((sealedValue) =>
              repository.update(
                owner,
                row,
                {
                  preview: previewOf(variable.value, row.secret),
                  sealedValue,
                },
                at
              )
            )
          );
        });

        const fresh = yield* Effect.forEach(
          input.variables.filter(
            (variable) => !existing.some(({ name }) => name === variable.name)
          ),
          (variable) =>
            Effect.gen(function* () {
              const id = yield* ids.generate("environmentVariable");
              const sealedValue = yield* sealVariable(cipher, variable.value, {
                id,
                name: variable.name,
                organizationId: actor.organizationId,
              });
              return {
                createdAt: at,
                createdBy: actor.isUser ? actor.id : null,
                id,
                name: variable.name,
                organizationId: actor.organizationId,
                ownerUserId: input.scope === "personal" ? actor.id : null,
                preview: previewOf(variable.value, variable.secret),
                scope: input.scope,
                sealedValue,
                secret: variable.secret,
                updatedAt: at,
              };
            })
        );
        const inserted = yield* repository.insert(fresh);

        return [
          ...replaced.flatMap((row) => (row === undefined ? [] : [row])),
          ...inserted,
        ].map(summaryOfVariable);
      }).pipe(
        Effect.withSpan("EnvironmentVariables.add"),
        Effect.annotateLogs({ organizationId: actor.organizationId })
      );

    const update = (actor: Actor, id: string, change: UpdateVariable) =>
      Effect.gen(function* () {
        if (change.scope !== undefined) {
          yield* personalNeedsAPerson(actor, change.scope);
        }
        const owner = ownerOf(actor);
        const row = yield* repository.find(owner, id);
        const sealedValue =
          change.value === undefined
            ? undefined
            : yield* sealVariable(cipher, change.value, row);
        const updated = yield* repository.update(
          owner,
          row,
          {
            ...(change.scope === undefined ? {} : { scope: change.scope }),
            ...(sealedValue === undefined || change.value === undefined
              ? {}
              : { preview: previewOf(change.value, row.secret), sealedValue }),
          },
          yield* now
        );
        return summaryOfVariable(updated);
      }).pipe(
        Effect.withSpan("EnvironmentVariables.update"),
        Effect.annotateLogs({ organizationId: actor.organizationId })
      );

    return EnvironmentVariables.of({
      add,
      list: (actor) =>
        repository.list(ownerOf(actor)).pipe(
          Effect.map((rows) => rows.map(summaryOfVariable)),
          Effect.withSpan("EnvironmentVariables.list")
        ),
      remove: (actor, id) =>
        repository
          .remove(ownerOf(actor), id)
          .pipe(Effect.withSpan("EnvironmentVariables.remove")),
      update,
    });
  })
).pipe(Layer.provide(VariableRepositoryLive));
