import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import type { EvalSimulatedUser } from "@sphynx/schema/domain/eval-turns";
import type { HarnessUsage } from "@sphynx/schema/domain/harness-event";
import { Effect, Option, Redacted, Ref, Schema } from "effect";
import { modelAccessFor } from "../../credentials/model-key";
import { CredentialResolver } from "../../credentials/resolver";
import { UserUnavailable } from "../../domain/errors";
import { MODEL_PROVIDERS } from "../../domain/model-providers";
import { promptInclusiveUsage } from "../../domain/prompt-inclusive-usage";
import { throughRun } from "../../domain/usage-tally";
import { userModel, userModelRoute } from "../../domain/variant";
import type {
  JoinConversation,
  UserConversation,
  UserTurnRequest,
} from "../../ports/simulated-user";
import { keepTagged } from "../keep-tagged";
import { spokenReply, systemPrompt } from "./persona";

const responseSchema = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      message: Schema.Struct({ content: Schema.NullOr(Schema.String) }),
    })
  ),
  usage: Schema.optional(
    Schema.Struct({
      completion_tokens: Schema.NonNegativeInt,
      prompt_tokens: Schema.NonNegativeInt,
      prompt_tokens_details: Schema.optional(
        Schema.Struct({ cached_tokens: Schema.optional(Schema.NonNegativeInt) })
      ),
      total_tokens: Schema.NonNegativeInt,
    })
  ),
});

const messagesFor = (user: EvalSimulatedUser, request: UserTurnRequest) => [
  { role: "system", content: systemPrompt(user) },
  ...request.spoken.map((text) => ({ role: "assistant", content: text })),
  { role: "user", content: request.agentText },
];

const labelOf = (providerId: string) =>
  MODEL_PROVIDERS.find(({ id }) => id === providerId)?.label ?? providerId;

export const makeLlmUser = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const credentials = yield* CredentialResolver;
  const { model, providerId } = userModelRoute(yield* userModel);

  return Effect.fn("LlmUser.join")(function* ({
    context,
    user,
  }: JoinConversation) {
    const access = yield* modelAccessFor(
      credentials,
      context.organizationId,
      providerId
    );

    if (Option.isNone(access)) {
      return yield* new UserUnavailable({
        reason: `no ${labelOf(providerId)} credential is configured for this organization`,
      });
    }

    const spent = yield* Ref.make(Option.none<HarnessUsage>());

    const reply = Effect.fn("LlmUser.reply")(function* (
      request: UserTurnRequest
    ) {
      const httpRequest = yield* HttpClientRequest.post(
        `${access.value.provider.baseUrl}/chat/completions`
      ).pipe(
        HttpClientRequest.bearerToken(Redacted.make(access.value.key)),
        HttpClientRequest.bodyJson({
          model,
          messages: messagesFor(user, request),
          max_completion_tokens: 512,
        })
      );
      const response = yield* client
        .execute(httpRequest)
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(responseSchema))
        );

      yield* Ref.update(spent, (carried) =>
        throughRun(
          carried,
          Option.fromNullable(response.usage).pipe(
            Option.map((usage) =>
              promptInclusiveUsage({
                cached: usage.prompt_tokens_details?.cached_tokens ?? 0,
                output: usage.completion_tokens,
                prompt: usage.prompt_tokens,
                total: usage.total_tokens,
              })
            )
          ),
          false
        )
      );

      return spokenReply(response.choices[0]?.message.content);
    });

    return {
      reply: (request) =>
        reply(request).pipe(
          keepTagged(
            "UserUnavailable",
            () =>
              new UserUnavailable({ reason: "the user model did not answer" })
          )
        ),
      spent: Effect.map(
        Ref.get(spent),
        Option.map((usage) => ({ model, usage }))
      ),
    } satisfies UserConversation;
  });
});
