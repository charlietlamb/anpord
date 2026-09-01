import type { Actor } from "@anpord/schema/domain/actor";
import type {
  CredentialBindings,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { Effect, Option, Redacted } from "effect";
import { modelFor } from "../domain/harness-models";
import type { GridExecutionTask } from "../grid/state";
import type { CredentialResolverShape } from "./connections";
import type { CredentialError } from "./errors";
import { CredentialError as CredentialFailure } from "./errors";

export interface RequestedTask {
  readonly credentials?: CredentialBindings;
  readonly harness: GridExecutionTask["harness"];
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: GridExecutionTask["provider"];
}

const optional = <A>(
  effect: Effect.Effect<A, CredentialError>,
  explicit: string | undefined
) =>
  explicit === undefined
    ? effect.pipe(Effect.option)
    : effect.pipe(Effect.map(Option.some));

const legacyCodex = (auth: string) =>
  Redacted.make<ResolvedCredential>({
    authMethodId: "legacy-auth-json",
    connectionId: "legacy-codex",
    integrationId: "codex",
    revision: 0,
    values: { authJson: auth },
  });

const bindingOf = (credential: Redacted.Redacted<ResolvedCredential>) => {
  const resolved = Redacted.value(credential);
  return resolved.revision === 0 ? undefined : resolved.connectionId;
};

const bindingsOf = (
  harness: Redacted.Redacted<ResolvedCredential>,
  sandbox?: Redacted.Redacted<ResolvedCredential>
): CredentialBindings => ({
  harnessConnectionId: bindingOf(harness),
  sandboxConnectionId: sandbox === undefined ? undefined : bindingOf(sandbox),
});

export const resolveTaskCredentials = (
  resolver: CredentialResolverShape,
  actor: Actor,
  tasks: readonly RequestedTask[],
  legacyHarnessAuth: string
) =>
  Effect.forEach(tasks, (task) =>
    Effect.gen(function* () {
      const harness = yield* optional(
        resolver.resolve({
          actor,
          connectionId: task.credentials?.harnessConnectionId,
          integrationId: task.harness,
        }),
        task.credentials?.harnessConnectionId
      );
      const sandbox = yield* optional(
        resolver.resolve({
          actor,
          connectionId: task.credentials?.sandboxConnectionId,
          integrationId: task.provider,
        }),
        task.credentials?.sandboxConnectionId
      );
      const resolvedHarness = yield* Option.match(harness, {
        onNone: () =>
          task.harness === "codex" && legacyHarnessAuth
            ? Effect.succeed(legacyCodex(legacyHarnessAuth))
            : Effect.fail(
                new CredentialFailure({
                  message: `No credential configured for ${task.harness}`,
                })
              ),
        onSome: Effect.succeed,
      });
      const resolvedSandbox = Option.getOrUndefined(sandbox);

      const harnessAuth = Redacted.value(resolvedHarness);

      /* Settled here rather than in the sandbox, where finding out costs a
         sandbox, an install and a model call before anybody is told. A
         subscription that chooses its own model runs on that one; the name it
         cannot honour is dropped, and said so. */
      const model = modelFor(harnessAuth, task.model);

      if (model !== task.model) {
        yield* Effect.logWarning("the credential chooses its own model").pipe(
          Effect.annotateLogs({
            asked: task.model,
            harness: task.harness,
          })
        );
      }

      return {
        bindings: bindingsOf(resolvedHarness, resolvedSandbox),
        credentials: {
          harness: resolvedHarness,
          ...(resolvedSandbox === undefined
            ? {}
            : { sandbox: resolvedSandbox }),
        },
        harness: task.harness,
        harnessVersion: task.harnessVersion,
        model,
        provider: task.provider,
      } satisfies GridExecutionTask;
    })
  ).pipe(
    Effect.withSpan("EvalCredentials.resolveTasks"),
    Effect.annotateLogs({
      organizationId: actor.organizationId,
      taskCount: tasks.length,
    })
  );
