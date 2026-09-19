import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import type { EvalSimulatedUser } from "@anpord/schema/domain/eval-turns";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Config, Effect, Layer, Option, Redacted, Schema } from "effect";
import { CredentialResolver } from "../../credentials/resolver";
import { userModel } from "../../domain/cell";
import { UserUnavailable } from "../../domain/errors";
import {
  SimulatedUser,
  type UserTurnRequest,
} from "../../ports/simulated-user";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

const DONE = "<<DONE>>";

const responseSchema = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      message: Schema.Struct({ content: Schema.NullOr(Schema.String) }),
    })
  ),
});

const systemPrompt = (user: EvalSimulatedUser) =>
  [
    "You are playing a HUMAN CUSTOMER talking to an AI coding agent. Stay in character; never reveal you are simulated.",
    `Your goal: ${user.goal}`,
    `What you know (your private brief — the agent must ask to learn it):\n${user.prompt}`,
    [
      "Rules:",
      "- Answer what the agent just asked. A broad question deserves everything in your brief that answers it. Do not volunteer what it has not asked about.",
      "- Never invent prices, limits, or features that are not in your brief.",
      "- You are non-technical: you cannot approve tool permissions, run commands, or edit files. If asked, say so and tell the agent to do its best without it.",
      "- Keep replies to one or two sentences.",
      `- When the agent has finished, or is only waiting on something you cannot do, reply with exactly ${DONE}`,
    ].join("\n"),
  ].join("\n\n");

/* The agent is the one being measured, so in this chat it speaks as the user
   and the simulated person answers as the assistant. */
const messagesFor = (request: UserTurnRequest) => [
  { role: "system", content: systemPrompt(request.user) },
  ...request.spoken.map((text) => ({ role: "assistant", content: text })),
  { role: "user", content: request.agentText },
];

const makeLlmUser = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const credentials = yield* CredentialResolver;
  const platformKey = yield* Config.option(Config.redacted("OPENAI_API_KEY"));
  const model = yield* userModel;

  const reply = Effect.fn("SimulatedUser.reply")(function* (
    request: UserTurnRequest
  ) {
    const actor = Actor.make({
      id: UserId.make(request.organizationId),
      organizationId: OrganizationId.make(request.organizationId),
      isUser: false,
      permissions: [],
    });
    const stored = (integrationId: string, field: string) =>
      credentials.resolve({ actor, integrationId }).pipe(
        Effect.map((value) =>
          Option.fromNullable(Redacted.value(value).values[field])
        ),
        Effect.catchIf(
          (error) => error.code === "not-found",
          () => Effect.succeed(Option.none<string>())
        )
      );
    const key = (yield* stored("openai", "apiKey")).pipe(
      Option.orElse(() => Option.map(platformKey, Redacted.value)),
      Option.filter((found) => found.trim() !== "")
    );

    if (Option.isNone(key)) {
      return yield* Effect.fail(
        new UserUnavailable({ reason: "no OpenAI credential is configured" })
      );
    }

    const httpRequest = yield* HttpClientRequest.post(ENDPOINT).pipe(
      HttpClientRequest.bearerToken(Redacted.make(key.value)),
      HttpClientRequest.bodyJson({
        model,
        messages: messagesFor(request),
        max_completion_tokens: 512,
      })
    );
    const response = yield* client
      .execute(httpRequest)
      .pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(responseSchema)));
    const said = response.choices[0]?.message.content?.trim() ?? "";

    return said === "" || said.includes(DONE)
      ? Option.none<string>()
      : Option.some(said);
  });

  return SimulatedUser.of({
    reply: (request) =>
      reply(request).pipe(
        Effect.mapError((error) =>
          error._tag === "UserUnavailable"
            ? error
            : new UserUnavailable({ reason: "the user model did not answer" })
        )
      ),
  });
});

export const SimulatedUserLive = Layer.effect(SimulatedUser, makeLlmUser);
