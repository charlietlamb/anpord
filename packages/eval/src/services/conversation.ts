import type { EvalTurn } from "@sphynx/schema/domain/eval-conversation";
import type {
  EvalScriptedUser,
  EvalTurnsEnded,
  EvalUser,
} from "@sphynx/schema/domain/eval-turns";
import type {
  HarnessEvent,
  ModelSpend,
} from "@sphynx/schema/domain/harness-event";
import { Chunk, Clock, Effect, Either, Option, Scope, Stream } from "effect";
import type { UserUnavailable } from "../domain/errors";
import { commandsIn, readAnswer, sessionIdOf } from "../domain/journal";
import { asEntries } from "../domain/journal-entries";
import {
  SimulatedUser,
  type UserContext,
  type UserConversation,
} from "../ports/simulated-user";
import type { ProgressSink } from "./trial-progress-sink";

type Turn<E, R> = (
  prompt: string,
  resume: Option.Option<string>
) => Effect.Effect<readonly HarnessEvent[], E, R>;

export const spokenThrough =
  <E, R>(sink: ProgressSink, turn: Turn<E, R>): Turn<E, R> =>
  (prompt, resume) =>
    Effect.gen(function* () {
      const at = yield* Clock.currentTimeMillis;
      const said = yield* Stream.make<[HarnessEvent]>({
        _tag: "Message",
        at,
        role: "user",
        text: prompt,
      }).pipe(sink.through, Stream.runCollect);
      const replied = yield* turn(prompt, resume);

      return [...Chunk.toReadonlyArray(said), ...replied];
    });

interface Transcript {
  readonly events: readonly HarnessEvent[];
  readonly turns: readonly EvalTurn[];
}

type Conversation = Transcript &
  (
    | { readonly ended: Exclude<EvalTurnsEnded, "no-user"> }
    | { readonly ended: "no-user"; readonly reason: string }
  );

type Spoken = Conversation & {
  readonly userSpend: Option.Option<ModelSpend>;
};

const unspent = (conversation: Conversation): Spoken => ({
  ...conversation,
  userSpend: Option.none(),
});

const turnOf = (
  index: number,
  userText: string,
  events: readonly HarnessEvent[]
): EvalTurn => ({
  agentText: readAnswer(events),
  commandCount: commandsIn(events),
  events: events.flatMap(asEntries),
  index,
  userText,
});

const scripted = (user: EvalScriptedUser): UserConversation => ({
  reply: ({ spoken }) =>
    Effect.succeed(Option.fromNullable(user.replies[spoken.length - 1])),
  spent: Effect.succeedNone,
});

const joined = (user: EvalUser, context: UserContext) =>
  user.kind === "scripted"
    ? Effect.succeed(scripted(user))
    : Effect.flatMap(SimulatedUser, (simulated) =>
        simulated.join({ context, user })
      );

const absent = (transcript: Transcript, error: UserUnavailable) =>
  Effect.logWarning("the simulated user could not speak").pipe(
    Effect.annotateLogs({
      reason: error.reason,
      turns: transcript.turns.length,
    }),
    Effect.as<Conversation>({
      ...transcript,
      ended: "no-user",
      reason: error.reason,
    })
  );

interface Continuing<E, R> {
  readonly events: HarnessEvent[];
  readonly maxTurns: number;
  readonly person: UserConversation;
  readonly run: Turn<E, R>;
  readonly session: Option.Option<string>;
  readonly spoken: string[];
  readonly turns: EvalTurn[];
}

const continued = <E, R>({
  events,
  maxTurns,
  person,
  run,
  session,
  spoken,
  turns,
}: Continuing<E, R>) =>
  Effect.gen(function* () {
    while (turns.length < maxTurns) {
      const reply = yield* Effect.either(
        person.reply({
          agentText: turns.at(-1)?.agentText ?? "",
          spoken,
        })
      );

      if (Either.isLeft(reply)) {
        return yield* absent({ events, turns }, reply.left);
      }

      const said = reply.right;

      if (Option.isNone(said)) {
        return { ended: "user-done", events, turns } satisfies Conversation;
      }

      const replied = yield* run(said.value, session);

      spoken.push(said.value);
      turns.push(turnOf(turns.length, said.value, replied));
      events.push(...replied);
    }

    return { ended: "max-turns", events, turns } satisfies Conversation;
  });

export const converse = <E, R>(input: {
  readonly context: UserContext;
  readonly maxTurns: number;
  readonly run: Turn<E, R>;
  readonly opening: string;
  readonly user: EvalUser | null;
}) =>
  Effect.gen(function* () {
    const first = yield* input.run(input.opening, Option.none());
    const session = Option.fromNullable(sessionIdOf(first));
    const turns: EvalTurn[] = [turnOf(0, input.opening, first)];
    const events: HarnessEvent[] = [...first];
    const { user } = input;

    if (user === null) {
      return unspent({ ended: "single-turn", events, turns });
    }

    if (Option.isNone(session)) {
      return unspent({ ended: "failed", events, turns });
    }

    return yield* Effect.acquireUseRelease(
      Scope.make(),
      (scope) =>
        Effect.either(
          joined(user, input.context).pipe(Scope.extend(scope))
        ).pipe(
          Effect.flatMap(
            Either.match({
              onLeft: (error) =>
                Effect.map(absent({ events, turns }, error), unspent),
              onRight: (person) =>
                continued({
                  events,
                  maxTurns: input.maxTurns,
                  person,
                  run: input.run,
                  session,
                  spoken: [input.opening],
                  turns,
                }).pipe(
                  Effect.flatMap((conversation) =>
                    Effect.map(
                      person.spent,
                      (userSpend): Spoken => ({ ...conversation, userSpend })
                    )
                  )
                ),
            })
          )
        ),
      (scope, exit) => Scope.close(scope, exit)
    );
  });
