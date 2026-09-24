import type { Actor } from "@anpord/schema/domain/actor";
import type {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { Context, Data, Effect, Layer, Option } from "effect";
import type { CodebaseError } from "./errors";
import { GithubApp, type GithubAppShape } from "./github-app";
import { GithubRepositories } from "./github-repositories";
import { Installations } from "./installations";

export class CodebaseUnconfigured extends Data.TaggedError(
  "CodebaseUnconfigured"
)<Readonly<Record<never, never>>> {
  override get message() {
    return "No GitHub app is registered for this deployment";
  }
}

const selectionOf = (
  value: string
): SourceControlAccount["repositorySelection"] =>
  value === "all" ? "all" : "selected";

export const make = Effect.gen(function* () {
  const app = yield* GithubApp;
  const installations = yield* Installations;
  const repositories = yield* GithubRepositories;

  const configured: Effect.Effect<GithubAppShape, CodebaseUnconfigured> =
    app === undefined
      ? Effect.fail(new CodebaseUnconfigured())
      : Effect.succeed(app);

  const installed = (actor: Actor) =>
    installations
      .forOrganization(actor.organizationId)
      .pipe(Effect.map((found) => (app === undefined ? Option.none() : found)));

  const account = Effect.fn("CodebaseConnection.account")(function* (
    actor: Actor
  ) {
    const found = yield* installed(actor);
    if (Option.isNone(found) || app === undefined) {
      return null;
    }
    return {
      installationId: found.value.id,
      login: found.value.accountLogin,
      manageUrl: app.manageUrl(found.value.id),
      repositorySelection: selectionOf(found.value.repositorySelection),
    } satisfies SourceControlAccount;
  });

  const repositoriesOf = Effect.fn("CodebaseConnection.repositories")(
    function* (actor: Actor) {
      const found = yield* installed(actor);
      if (Option.isNone(found) || app === undefined) {
        return [] as readonly Repository[];
      }
      return yield* repositories.list(yield* app.tokenFor(found.value.id));
    }
  );

  const installUrl = Effect.fn("CodebaseConnection.installUrl")(function* (
    actor: Actor
  ) {
    return { url: (yield* configured).installUrl(actor.organizationId) };
  });

  const connect = Effect.fn("CodebaseConnection.connect")(function* (
    actor: Actor,
    installationId: number | undefined
  ) {
    const github = yield* configured;
    const jwt = yield* github.jwt;
    const found =
      installationId === undefined
        ? (yield* repositories.installations(jwt)).at(-1)
        : yield* repositories.installation(jwt, installationId);

    if (found === undefined) {
      return null;
    }

    yield* installations.record(actor, {
      accountLogin: found.login,
      id: found.id,
      repositorySelection: found.repositorySelection,
    });

    return {
      installationId: found.id,
      login: found.login,
      manageUrl: github.manageUrl(found.id),
      repositorySelection: found.repositorySelection,
    } satisfies SourceControlAccount;
  });

  const disconnect = Effect.fn("CodebaseConnection.disconnect")(
    (actor: Actor) => installations.remove(actor)
  );

  return {
    account,
    connect,
    disconnect,
    installUrl,
    repositories: repositoriesOf,
  };
});

export class CodebaseConnection extends Context.Tag(
  "@anpord/eval/CodebaseConnection"
)<CodebaseConnection, Effect.Effect.Success<typeof make>>() {}

export const CodebaseConnectionLive = Layer.effect(CodebaseConnection, make);

export type CodebaseFailure = CodebaseError | CodebaseUnconfigured;
