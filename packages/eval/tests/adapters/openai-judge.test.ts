import { expect, test } from "bun:test";
import { EvalJudge } from "@anpord/schema/domain/eval-judges";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import { ConfigProvider, Effect, Layer, Redacted, Schema } from "effect";
import { connectionNotFound } from "../../src/credentials/errors";
import { CredentialResolver } from "../../src/credentials/resolver";
import { makeOpenAIJudge } from "../../src/judges/openai";
import { emptyEnvCredential } from "../fixtures/credentials";

const request = {
  judge: Schema.decodeUnknownSync(EvalJudge)({
    kind: "judge",
    name: "correctness",
    provider: "openai",
    model: "exact-model",
    prompt: "Be accurate",
    choices: { correct: 1, incorrect: 0 },
  }),
  context: {
    organizationId: "test",
    provider: "e2b" as const,
    harnessCredential: emptyEnvCredential,
  },
  input: "What is 2 + 2?",
  output: "4",
};

const complete = (body: unknown, status = 200, authenticated = true) => {
  let calls = 0;
  const client = HttpClient.make((httpRequest) =>
    Effect.sync(() => {
      calls += 1;
      expect(httpRequest.url).toBe("https://api.openai.com/v1/responses");
      expect(httpRequest.method).toBe("POST");
      if (httpRequest.body._tag !== "Uint8Array") {
        throw new Error("Expected JSON body");
      }
      const sent = JSON.parse(new TextDecoder().decode(httpRequest.body.body));
      expect(sent).toMatchObject({
        model: "exact-model",
        store: false,
        text: { format: { type: "json_schema", strict: true } },
      });
      expect(sent.text.format.schema.additionalProperties).toBe(false);
      expect(sent.tools).toBeUndefined();
      expect(sent.instructions).toContain(request.judge.prompt);
      return HttpClientResponse.fromWeb(
        httpRequest,
        Response.json(body, { status })
      );
    })
  );
  const credentials = Layer.succeed(CredentialResolver, {
    resolve: () =>
      authenticated
        ? Effect.succeed(
            Redacted.make({
              ...Redacted.value(emptyEnvCredential),
              values: { OPENAI_API_KEY: "test-secret" },
            })
          )
        : Effect.fail(connectionNotFound()),
    resolveBound: () => Effect.fail(connectionNotFound()),
  });
  return Effect.runPromise(
    Effect.gen(function* () {
      const run = yield* makeOpenAIJudge;
      return { result: yield* Effect.either(run(request)), calls };
    }).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
      Effect.provide(credentials),
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map()))
    )
  );
};

test("sends strict structured output requirements with the exact model", async () => {
  const { result } = await complete({
    status: "completed",
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: '{"choice":"correct","reason":"Correct"}',
          },
        ],
      },
    ],
  });
  expect(result._tag).toBe("Right");
});

test.each([
  { status: "incomplete", output: [] },
  {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "refusal", refusal: "Cannot score" }],
      },
    ],
  },
])("preserves incomplete or refused responses for the evaluator", async (response) => {
  const result = (await complete(response)).result;
  expect(result._tag).toBe("Right");
  if (result._tag === "Right") {
    expect(result.right.incomplete || result.right.refusal !== undefined).toBe(
      true
    );
  }
});

test("does not expose provider response bodies in errors", async () => {
  const { result } = await complete({ error: "test-secret" }, 401);
  expect(result._tag).toBe("Left");
  expect(JSON.stringify(result)).not.toContain("test-secret");
});

test("fails without credentials before making a request", async () => {
  const { result, calls } = await complete({}, 200, false);
  expect(result._tag).toBe("Left");
  expect(calls).toBe(0);
});
