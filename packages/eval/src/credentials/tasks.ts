import type { Actor } from "@anpord/schema/domain/actor";
import type {
  CredentialBindings,
  ResolvedCredential,
} from "@anpord/schema/domain/credentials";
import { Effect, Option, Redacted } from "effect";
import type { GridExecutionTask } from "../grid/state";
import type { CredentialError } from "./errors";
import { CredentialError as CredentialFailure } from "./errors";
import type { CredentialResolverShape } from "./resolver";

export interface RequestedTask {
  readonly credentials?: CredentialBindings;
  readonly harness: GridExecutionTask["harness"];
  readonly harnessVersion: string;
  readonly model: string;
  readonly profile: GridExecutionTask["profile"];
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

/* Harnesses that run without any credential of their own. Compared as strings
   so this file is unchanged when the harness literal gains the name. */
const KEYLESS_HARNESSES: ReadonlySet<string> = new Set(["command"]);

/* Revision 0 leaves the cell unbound, as the legacy Codex fallback does: there
   is no stored connection a resume could look up. */
const emptyEnv = () =>
  Redacted.make<ResolvedCredential>({
    authMethodId: "env",
    connectionId: "env-none",
    integrationId: "env",
    revision: 0,
    values: {},
  });

/* An env credential serves any harness, so a lookup that finds nothing under
   the harness's own integration asks for one before giving up. Only a miss
   falls through; a store failure is reported as it is. */
const resolveHarness = (
  resolver: CredentialResolverShape,
  actor: Actor,
  task: RequestedTask
) => {
  const connectionId = task.credentials?.harnessConnectionId;
  const resolve = (integrationId: string) =>
    resolver.resolve({ actor, connectionId, integrationId });

  return resolve(task.harness).pipe(
    Effect.catchIf(
      (error) => error.code === "not-found",
      () => resolve("env")
    )
  );
};

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
        resolveHarness(resolver, actor, task),
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
        onNone: () => {
          if (task.harness === "codex" && legacyHarnessAuth) {
            return Effect.succeed(legacyCodex(legacyHarnessAuth));
          }
          if (KEYLESS_HARNESSES.has(task.harness)) {
            return Effect.succeed(emptyEnv());
          }
          return Effect.fail(
            new CredentialFailure({
              message: `No credential configured for ${task.harness}`,
            })
          );
        },
        onSome: Effect.succeed,
      });
      const resolvedSandbox = Option.getOrUndefined(sandbox);

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
        model: task.model,
        profile: task.profile,
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
