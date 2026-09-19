import type {
  EvalTurn,
  EvalTurnsEnded,
  EvalUser,
} from "@anpord/schema/domain/eval-turns";
import { MAX_USER_TURNS } from "@anpord/schema/domain/eval-turns";
import { Effect, Option } from "effect";
import type { HarnessEvent } from "../domain/harness-event";
import { commandsIn, readAnswer, sessionIdOf } from "../domain/journal";
import { SimulatedUser } from "../ports/simulated-user";

interface Conversation {
  readonly ended: EvalTurnsEnded;
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

type Said =
  | { readonly _tag: "said"; readonly text: string }
  | { readonly _tag: "done" }
  | { readonly _tag: "absent"; readonly reason: string };

const nextText = (
  user: EvalUser,
  spoken: readonly string[],
  agentText: string,
  organizationId: string
): Effect.Effect<Said, never, SimulatedUser> =>
  user.kind === "scripted"
    ? Effect.succeed(
        Option.match(Option.fromNullable(user.replies[spoken.length - 1]), {
          onNone: (): Said => ({ _tag: "done" }),
          onSome: (text): Said => ({ _tag: "said", text }),
        })
      )
    : SimulatedUser.pipe(
        Effect.flatMap((simulated) =>
          simulated.reply({ agentText, organizationId, spoken, user })
        ),
        Effect.map(
          Option.match({
            onNone: (): Said => ({ _tag: "done" }),
            onSome: (text): Said => ({ _tag: "said", text }),
          })
        ),
        Effect.catchTag("UserUnavailable", (error) =>
          Effect.succeed<Said>({ _tag: "absent", reason: error.reason })
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

      if (said._tag === "done") {
        ended = "user-done";
        break;
      }

      if (said._tag === "absent") {
        yield* Effect.logWarning("the simulated user could not speak").pipe(
          Effect.annotateLogs({ reason: said.reason, turns: turns.length })
        );
        ended = "no-user";
        break;
      }

      const replied = yield* input.run(said.text, session);

      spoken.push(said.text);
      turns.push(turnOf(turns.length, said.text, replied));
      events.push(...replied);
    }

    return { ended, events, turns } satisfies Conversation;
  });
