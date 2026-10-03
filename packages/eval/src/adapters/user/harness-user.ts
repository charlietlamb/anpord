import type { EvalSimulatedUser } from "@sphynx/schema/domain/eval-turns";
import type { HarnessUsage } from "@sphynx/schema/domain/harness-event";
import { Chunk, Effect, Option, Random, Redacted, Ref, Stream } from "effect";
import { CredentialResolver } from "../../credentials/resolver";
import { systemActor } from "../../credentials/system-actor";
import { UserUnavailable } from "../../domain/errors";
import { readAnswer, sessionIdOf } from "../../domain/journal";
import { reportsWholeSession, throughRun } from "../../domain/usage-tally";
import { Harnesses } from "../../ports/harness";
import { SandboxProvider } from "../../ports/sandbox";
import type {
  JoinConversation,
  UserConversation,
  UserTurnRequest,
} from "../../ports/simulated-user";
import { captureCredentialRotation } from "../../services/credential-rotation";
import { HarnessVersions } from "../../services/harness-versions";
import { shellQuote } from "../harness/process";
import { keepTagged } from "../keep-tagged";
import { runCommandForOutcome } from "../sandbox/run-command";
import { spokenReply, systemPrompt } from "./persona";

const agentSaid = (request: UserTurnRequest) =>
  `The agent just said:\n${request.agentText}`;

const openingPrompt = (user: EvalSimulatedUser, request: UserTurnRequest) =>
  [
    systemPrompt(user),
    "Reply with only the words you say to the agent. Do not run commands, read files, or edit files.",
    `What you have said so far, oldest first:\n${request.spoken.map((text) => `- ${text}`).join("\n")}`,
    agentSaid(request),
  ].join("\n\n");

const workspaceOf = Random.nextIntBetween(0x10_00_00_00, 0x7f_ff_ff_ff).pipe(
  Effect.map((suffix) => `/tmp/sphynx-user-${suffix.toString(16)}`)
);

export const makeHarnessUser = Effect.gen(function* () {
  const harnesses = yield* Harnesses;
  const versions = yield* HarnessVersions;
  const sandboxes = yield* SandboxProvider;
  const credentials = yield* CredentialResolver;

  return Effect.fn("HarnessUser.join")(function* ({
    context,
    user,
  }: JoinConversation<
    Extract<EvalSimulatedUser, { readonly harness: string }>
  >) {
    const { harness, model } = user;
    const credential =
      Redacted.value(context.harnessCredential).integrationId === harness
        ? context.harnessCredential
        : yield* credentials
            .resolve({
              actor: systemActor(context.organizationId),
              integrationId: harness,
            })
            .pipe(
              Effect.mapError(
                () =>
                  new UserUnavailable({
                    reason: `nothing in Settings > Environment runs ${harness}`,
                  })
              )
            );
    const workspace = yield* workspaceOf;
    const started = yield* Effect.gen(function* () {
      const sandbox = yield* sandboxes.open({
        autoStopMinutes: context.autoStopMinutes,
        credentials: context.sandboxCredentials,
        provider: context.provider,
        workspace,
      });
      yield* Effect.addFinalizer(() =>
        Effect.ignore(
          runCommandForOutcome(sandbox, `rm -rf ${shellQuote(workspace)}`)
        )
      );
      const driver = yield* harnesses.resolve(harness);
      const version = yield* versions.version(harness);
      const prepared = {
        credential,
        home: sandbox.home,
        profile: Option.none(),
        sandbox,
        version,
      };
      const env = yield* driver.prepare(prepared);

      yield* Effect.addFinalizer(() =>
        captureCredentialRotation({
          ...prepared,
          credentials,
          driver,
          organizationId: context.organizationId,
        })
      );

      return { driver, env, sandbox, version };
    }).pipe(
      Effect.mapError(
        () =>
          new UserUnavailable({
            reason: `the user's ${harness} sandbox could not start`,
          })
      )
    );

    const session = yield* Ref.make(Option.none<string>());
    const spent = yield* Ref.make(Option.none<HarnessUsage>());

    const reply = (request: UserTurnRequest) =>
      Effect.gen(function* () {
        const resume =
          started.driver.resume === "unsupported"
            ? Option.none<string>()
            : yield* Ref.get(session);
        const run = yield* started.driver.run({
          env: started.env,
          harness,
          harnessVersion: started.version,
          model,
          profile: Option.none(),
          prompt: Option.isSome(resume)
            ? agentSaid(request)
            : openingPrompt(user, request),
          resume,
          sandbox: started.sandbox,
          systemPromptPath: Option.none(),
          workspace,
        });
        const events = Chunk.toReadonlyArray(
          yield* Stream.runCollect(run.events)
        );
        const usage = yield* run.usage;

        yield* Ref.update(spent, (carried) =>
          throughRun(
            carried,
            usage,
            reportsWholeSession(started.driver.resume, resume)
          )
        );
        yield* Ref.update(session, (prior) =>
          Option.orElse(Option.fromNullable(sessionIdOf(events)), () => prior)
        );

        return spokenReply(readAnswer(events));
      }).pipe(
        Effect.scoped,
        keepTagged(
          "UserUnavailable",
          () =>
            new UserUnavailable({
              reason: `the user's ${harness} harness did not answer`,
            })
        ),
        Effect.withSpan("HarnessUser.reply")
      );

    return {
      reply,
      spent: Effect.map(
        Ref.get(spent),
        Option.map((usage) => ({ model, usage }))
      ),
    } satisfies UserConversation;
  });
});
