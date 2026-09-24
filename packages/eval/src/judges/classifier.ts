import type { EvalClassifier } from "@anpord/schema/domain/eval-classifiers";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Clock, Effect, Option, Redacted, Schema } from "effect";
import { keepTagged } from "../adapters/keep-tagged";
import { apiKeyFor } from "../credentials/model-key";
import { CredentialResolver } from "../credentials/resolver";
import { classificationOutcome } from "../domain/classification";
import { JudgeFailed } from "./model";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

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
});

interface ClassifyRequest {
  readonly classifier: EvalClassifier;
  readonly input: string;
  readonly onRequest?: (input: unknown) => Effect.Effect<void>;
  readonly organizationId: string;
  readonly output: string;
}

const classify = (request: ClassifyRequest) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk
    );
    const credentials = yield* CredentialResolver;
    const key = yield* apiKeyFor(
      credentials,
      request.organizationId,
      "typesafe",
      "TYPESAFE_API_KEY"
    );

    if (Option.isNone(key)) {
      return yield* Effect.fail(
        new JudgeFailed({ message: "No TypeSafe credential is configured" })
      );
    }

    const body = {
      model: request.classifier.model,
      state: { input: request.input, output: request.output },
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

    const response = yield* HttpClientRequest.post(ENDPOINT).pipe(
      HttpClientRequest.bearerToken(Redacted.make(key.value)),
      HttpClientRequest.bodyJson(body),
      Effect.flatMap((post) => client.execute(post)),
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
    keepTagged(
      "JudgeFailed",
      () =>
        new JudgeFailed({
          message: "The TypeSafe classifier could not complete",
        })
    ),
    Effect.withSpan("Classifier.classify")
  );

export const classifyCase = (request: ClassifyRequest) =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const answer = yield* classify(request).pipe(Effect.either);
    const durationMs = Math.max(0, (yield* Clock.currentTimeMillis) - started);

    if (answer._tag === "Right") {
      return classificationOutcome(
        request.classifier,
        answer.right,
        durationMs
      );
    }

    return {
      choice: null,
      confidence: null,
      durationMs,
      error: answer.left.message,
      expected: request.classifier.expect,
      minConfidence: request.classifier.minConfidence,
      model: request.classifier.model,
      name: request.classifier.name,
      probabilities: {},
    };
  });
