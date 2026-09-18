import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";
import type { EvalClassifier } from "@anpord/schema/domain/eval-classifiers";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Config, Effect, Option, Redacted, Schema } from "effect";
import { CredentialResolver } from "../credentials/resolver";
import { JudgeFailed } from "./model";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/* One question per request, so the id is fixed rather than generated. */
const QUESTION = "verdict";

const responseSchema = Schema.Struct({
  model: Schema.optional(Schema.String),
  answers: Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      type: Schema.Literal("choice"),
      choice: Schema.String,
      confidence: Schema.Number,
      probabilities: Schema.Record({
        key: Schema.String,
        value: Schema.Number,
      }),
    }),
  }),
  usage: Schema.optional(
    Schema.Struct({
      input_tokens: Schema.NonNegativeInt,
      output_tokens: Schema.NonNegativeInt,
    })
  ),
});

export interface ClassifyRequest {
  readonly classifier: EvalClassifier;
  readonly input: string;
  readonly onRequest?: (input: unknown) => Effect.Effect<void>;
  readonly organizationId: string;
  readonly output: string;
}

export const makeTypeSafeClassifier = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const credentials = yield* CredentialResolver;
  const platformKey = yield* Config.option(Config.redacted("TYPESAFE_API_KEY"));

  return (request: ClassifyRequest) =>
    Effect.gen(function* () {
      const actor = Actor.make({
        id: UserId.make(request.organizationId),
        organizationId: OrganizationId.make(request.organizationId),
        isUser: false,
        permissions: [],
      });
      const resolved = yield* credentials
        .resolve({ actor, integrationId: "env" })
        .pipe(
          Effect.map((value) =>
            Option.fromNullable(Redacted.value(value).values.TYPESAFE_API_KEY)
          ),
          Effect.catchIf(
            (error) => error.code === "not-found",
            () => Effect.succeed(Option.none<string>())
          )
        );
      const key = Option.orElse(resolved, () =>
        Option.map(platformKey, Redacted.value)
      );

      if (Option.isNone(key)) {
        return yield* Effect.fail(
          new JudgeFailed({
            message: "No TypeSafe credential is configured",
          })
        );
      }

      const body = {
        model: request.classifier.model,
        /* Evidence travels as state rather than as instructions, so the
           agent's own output cannot redirect the classification. */
        state: {
          input: request.input,
          output: request.output,
        },
        questions: {
          [QUESTION]: {
            type: "choice",
            instructions: request.classifier.prompt,
            criteria: request.classifier.options,
          },
        },
      };

      if (request.onRequest) {
        yield* request.onRequest(body);
      }

      const httpRequest = yield* HttpClientRequest.post(ENDPOINT).pipe(
        HttpClientRequest.bearerToken(Redacted.make(key.value)),
        HttpClientRequest.bodyJson(body)
      );
      const response = yield* client
        .execute(httpRequest)
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(responseSchema))
        );
      const answer = response.answers[QUESTION];

      if (answer === undefined) {
        return yield* Effect.fail(
          new JudgeFailed({ message: "TypeSafe returned no answer" })
        );
      }

      return {
        choice: answer.choice,
        confidence: answer.confidence,
        model: response.model ?? request.classifier.model,
        probabilities: answer.probabilities,
      };
    }).pipe(
      Effect.scoped,
      Effect.mapError((error) =>
        error._tag === "JudgeFailed"
          ? error
          : new JudgeFailed({
              message: "The TypeSafe classifier could not complete",
            })
      ),
      Effect.withSpan("TypeSafeClassifier.classify")
    );
});
