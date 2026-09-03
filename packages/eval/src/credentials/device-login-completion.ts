import type { Actor } from "@anpord/schema/domain/actor";
import type { StartDeviceAuth } from "@anpord/schema/domain/credentials";
import { Effect } from "effect";
import type { CredentialAuthAttemptRepositoryShape } from "./auth-attempt-repository";
import { sealAttemptState } from "./auth-attempt-state";
import type { CredentialCipherShape } from "./cipher";
import type { CodexLogin } from "./codex-login";
import type { CredentialConnectionsShape } from "./connections";

interface Completion {
  readonly attempts: CredentialAuthAttemptRepositoryShape;
  readonly cipher: CredentialCipherShape;
  readonly connections: CredentialConnectionsShape;
}

/** Runs after the challenge is answered in a browser, so it outlives the request. */
export const completeDeviceLogin = (
  { attempts, cipher, connections }: Completion,
  login: CodexLogin,
  actor: Actor,
  attemptId: string,
  input: StartDeviceAuth
) =>
  login.authJson.pipe(
    Effect.flatMap((authJson) =>
      connections.create(actor, {
        authMethodId: "chatgpt",
        integrationId: "codex",
        isDefault: false,
        name: input.name,
        scope: input.scope,
        values: { authJson },
      })
    ),
    Effect.flatMap((connection) =>
      sealAttemptState(cipher, actor.organizationId, attemptId, {
        connectionId: connection.id,
      }).pipe(
        Effect.flatMap((state) =>
          attempts.finish(attemptId, {
            sealedState: state,
            status: "complete",
          })
        )
      )
    ),
    Effect.catchAll(() =>
      attempts.finish(attemptId, { status: "failed" }).pipe(Effect.ignore)
    ),
    Effect.ensuring(login.cleanup)
  );
