import type {
  CredentialValues,
  ResolvedCredential,
} from "@sphynx/schema/domain/credentials";
import type { EvalSimulatedUser } from "@sphynx/schema/domain/eval-turns";
import type { ModelSpend } from "@sphynx/schema/domain/harness-event";
import {
  Context,
  Effect,
  Layer,
  type Option,
  type Redacted,
  type Scope,
} from "effect";
import type { UserUnavailable } from "../domain/errors";
import type { SandboxName } from "../domain/variant";

export interface UserContext {
  readonly autoStopMinutes: number;
  readonly harnessCredential: Redacted.Redacted<ResolvedCredential>;
  readonly organizationId: string;
  readonly provider: SandboxName;
  readonly sandboxCredentials?: Redacted.Redacted<CredentialValues>;
}

export interface UserTurnRequest {
  readonly agentText: string;
  readonly spoken: readonly string[];
}

/* None ends the conversation: the user is satisfied, has nothing to answer, or
   has spent the turns the case allowed. */
export interface UserConversation {
  readonly reply: (
    request: UserTurnRequest
  ) => Effect.Effect<Option.Option<string>, UserUnavailable>;
  readonly spent: Effect.Effect<Option.Option<ModelSpend>>;
}

export interface JoinConversation<
  User extends EvalSimulatedUser = EvalSimulatedUser,
> {
  readonly context: UserContext;
  readonly user: User;
}

export interface SimulatedUserShape {
  readonly join: (
    request: JoinConversation
  ) => Effect.Effect<UserConversation, UserUnavailable, Scope.Scope>;
}

export class SimulatedUser extends Context.Tag("@sphynx/eval/SimulatedUser")<
  SimulatedUser,
  SimulatedUserShape
>() {}

export const SimulatedUserSilent = Layer.succeed(SimulatedUser, {
  join: () =>
    Effect.succeed({
      reply: () => Effect.succeedNone,
      spent: Effect.succeedNone,
    }),
});
