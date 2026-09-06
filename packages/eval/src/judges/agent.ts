import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import { Chunk, Effect, Option, Redacted, Stream } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import { answerOf } from "../domain/journal";
import { Harnesses } from "../ports/harness";
import { SandboxProvider } from "../ports/sandbox";
import { HarnessVersions } from "../services/harness-versions";
import { JudgeFailed, type JudgeRequest } from "./model";
import { judgeEvidence, judgeInstructions } from "./prompt";

export const makeAgentJudge = Effect.gen(function* () {
  const harnesses = yield* Harnesses;
  const versions = yield* HarnessVersions;
  const sandboxes = yield* SandboxProvider;
  const credentials = yield* CredentialResolver;

  return (request: JudgeRequest) =>
    Effect.gen(function* () {
      if (request.judge.harness === undefined) {
        return yield* Effect.fail(
          new JudgeFailed({ message: "An agent judge needs a harness" })
        );
      }
      const { harness, model } = request.judge;
      const context = request.context;
      const actor = Actor.make({
        id: UserId.make(context.organizationId),
        organizationId: OrganizationId.make(context.organizationId),
        isUser: false,
        permissions: [],
      });
      const credential =
        Redacted.value(context.harnessCredential).integrationId === harness
          ? context.harnessCredential
          : yield* credentials.resolve({ actor, integrationId: harness });
      const sandbox = yield* sandboxes.open({
        provider: context.provider,
        credentials: context.sandboxCredentials,
        autoStopMinutes: 5,
        workspace: "/tmp/anpord-judge",
      });
      const driver = yield* harnesses.resolve(harness);
      const version = yield* versions.version(harness);
      const env = yield* driver.prepare({
        credential,
        home: sandbox.home,
        profile: Option.none(),
        sandbox,
        version,
      });
      const session = yield* driver.run({
        env,
        harness,
        harnessVersion: version,
        model,
        profile: Option.none(),
        prompt: `${judgeInstructions(request)}\n\nEvidence:\n${judgeEvidence(request)}`,
        sandbox,
        systemPromptPath: Option.none(),
        workspace: "/tmp/anpord-judge",
      });
      const events = Chunk.toReadonlyArray(
        yield* Stream.runCollect(session.events)
      );
      if (
        events.some(
          (event) => event._tag === "Command" || event._tag === "ToolCall"
        )
      ) {
        return yield* Effect.fail(
          new JudgeFailed({
            message:
              "The judge used tools instead of scoring the supplied evidence",
          })
        );
      }
      return answerOf(events);
    }).pipe(
      Effect.scoped,
      Effect.mapError((error) =>
        error._tag === "JudgeFailed"
          ? error
          : new JudgeFailed({ message: "The agent judge could not complete" })
      ),
      Effect.withSpan("AgentJudge.complete")
    );
});
