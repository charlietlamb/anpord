import type { EvalSimulatedUser } from "@anpord/schema/domain/eval-turns";
import { Context, type Effect, type Option } from "effect";
import type { UserUnavailable } from "../domain/errors";

export interface UserTurnRequest {
  /* Empty on the opening turn, which the case states rather than generates. */
  readonly agentText: string;
  readonly organizationId: string;
  readonly spoken: readonly string[];
  readonly user: EvalSimulatedUser;
}

/* None ends the conversation: the user is satisfied, has nothing to answer, or
   has spent the turns the case allowed. */
export interface SimulatedUserShape {
  readonly reply: (
    request: UserTurnRequest
  ) => Effect.Effect<Option.Option<string>, UserUnavailable>;
}

export class SimulatedUser extends Context.Tag("@anpord/eval/SimulatedUser")<
  SimulatedUser,
  SimulatedUserShape
>() {}
