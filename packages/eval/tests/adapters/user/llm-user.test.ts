import { describe, expect, it } from "bun:test";
import { EvalSimulatedUser } from "@anpord/schema/domain/eval-turns";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import { ConfigProvider, Effect, Option, Redacted, Schema } from "effect";
import { makeLlmUser } from "../../../src/adapters/user/llm-user";
import { nothingConnected } from "../../fixtures/nothing-connected";

const answering = HttpClient.make((request) =>
  Effect.succeed(
    HttpClientResponse.fromWeb(
      request,
      Response.json({
        choices: [{ message: { content: "It should be blue." } }],
        usage: {
          completion_tokens: 20,
          prompt_tokens: 1000,
          prompt_tokens_details: { cached_tokens: 800 },
          total_tokens: 1020,
        },
      })
    )
  )
);

describe("a person played by a model", () => {
  it("adds up what every reply spent, cached input apart from fresh", async () => {
    const spent = await Effect.runPromise(
      Effect.gen(function* () {
        const join = yield* makeLlmUser;
        const person = yield* join({
          context: {
            autoStopMinutes: 5,
            harnessCredential: Redacted.make({
              authMethodId: "api-key",
              connectionId: "c",
              integrationId: "codex",
              revision: 1,
              values: {},
            }),
            organizationId: "org_llm_user",
            provider: "local",
          },
          user: Schema.decodeUnknownSync(EvalSimulatedUser)({
            goal: "a blue button",
            kind: "simulated",
            prompt: "The button should be blue.",
          }),
        });
        yield* person.reply({ agentText: "Which colour?", spoken: ["Paint"] });
        yield* person.reply({ agentText: "Done.", spoken: ["Paint", "Blue"] });
        return yield* person.spent;
      }).pipe(
        Effect.scoped,
        Effect.provideService(HttpClient.HttpClient, answering),
        Effect.provide(nothingConnected),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ["ANPORD_USER_MODEL", "openai/person-model"],
              ["OPENAI_API_KEY", "platform-key"],
            ])
          )
        )
      )
    );

    expect(spent).toEqual(
      Option.some({
        model: "person-model",
        usage: {
          cacheReadTokens: 1600,
          cacheWriteTokens: 0,
          inputTokens: 400,
          outputTokens: 40,
          totalTokens: 2040,
        },
      })
    );
  });
});
