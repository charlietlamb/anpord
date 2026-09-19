import type { EvalTurn, EvalUser } from "@anpord/schema/domain/eval-turns";
import { MAX_USER_TURNS } from "@anpord/schema/domain/eval-turns";
import { Effect, Option } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import { commandsIn, readAnswer, sessionIdOf } from "../domain/journal";
import { SimulatedUser } from "../ports/simulated-user";

interface Conversation {
  readonly ended: "user-done" | "max-turns" | "failed";
  readonly events: readonly HarnessEvent[];
  readonly turns: readonly EvalTurn[];
}

const turnOf = (
  index: number,
  userText: string,
  events: readonly HarnessEvent[]
): EvalTurn => ({
  agentText: readAnswer(events),
  commandCount: commandsIn(events),
  index,
  userText,
});

const nextText = (
  user: EvalUser,
  spoken: readonly string[],
  agentText: string,
  organizationId: string
) =>
  user.kind === "scripted"
    ? Effect.succeed(Option.fromNullable(user.replies[spoken.length - 1]))
    : SimulatedUser.pipe(
        Effect.flatMap((simulated) =>
          simulated.reply({ agentText, organizationId, spoken, user })
        ),
        Effect.catchTag("UserUnavailable", () =>
          Effect.succeed(Option.none<string>())
        )
      );

export const converse = <E, R>(input: {
  readonly organizationId: string;
  readonly run: (
    turn: string,
    resume: Option.Option<string>
  ) => Effect.Effect<readonly HarnessEvent[], E, R>;
  readonly opening: string;
  readonly user: EvalUser;
}) =>
  Effect.gen(function* () {
    const first = yield* input.run(input.opening, Option.none());
    const session = Option.fromNullable(sessionIdOf(first));
    const turns: EvalTurn[] = [turnOf(0, input.opening, first)];
    const events: HarnessEvent[] = [...first];
    const spoken: string[] = [input.opening];

    if (Option.isNone(session)) {
      return { ended: "failed", events, turns } satisfies Conversation;
    }

    let ended: Conversation["ended"] = "max-turns";

    while (turns.length < MAX_USER_TURNS) {
      const said = yield* nextText(
        input.user,
        spoken,
        turns.at(-1)?.agentText ?? "",
        input.organizationId
      );

      if (Option.isNone(said)) {
        ended = "user-done";
        break;
      }

      const replied = yield* input.run(said.value, session);

      spoken.push(said.value);
      turns.push(turnOf(turns.length, said.value, replied));
      events.push(...replied);
    }

    return { ended, events, turns } satisfies Conversation;
  });
