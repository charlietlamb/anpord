import type { ApiCall } from "@anpord/schema/domain/api-mocks";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { Clock, Effect, Option, Ref, Schema } from "effect";
import { apiCapture } from "./capture";
import type { ApiDefinition, EndpointDefinition } from "./define";
import { type ApiMockError, ApiRequestError } from "./errors";
import { bodyless, endpointResponse } from "./response";

const Json = Schema.parseJson(Schema.Unknown);
const JSON_CONTENT_TYPE = /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/i;

export const requestHandler = (
  definition: ApiDefinition,
  route: EndpointDefinition | undefined,
  sequence: Ref.Ref<number>,
  record: (call: ApiCall) => Effect.Effect<void, ApiMockError>
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const routeContext = yield* Effect.serviceOption(HttpRouter.RouteContext);
    const params = Option.isSome(routeContext) ? routeContext.value.params : {};
    const index = yield* Ref.getAndUpdate(sequence, (value) => value + 1);
    const startedAt = yield* Clock.currentTimeMillis;
    const url = new URL(request.url, "http://localhost");
    const capture = apiCapture(definition.redact);
    const captureLog = apiCapture(definition.redact);
    const logs: ApiCall["logs"][number][] = [];
    const fields = {
      params,
      query: HttpServerRequest.searchParamsFromURL(url),
      headers: request.headers,
    };
    let input: unknown = fields;
    const save = (status: number, output: unknown, error: string | null) =>
      Effect.gen(function* () {
        const finishedAt = yield* Clock.currentTimeMillis;
        yield* record({
          api: definition.name,
          index,
          method: request.method,
          path: url.pathname,
          matched: route !== undefined,
          startedAt,
          durationMs: Math.max(0, Math.round(finishedAt - startedAt)),
          input: capture(input),
          output: capture(output),
          status,
          error,
          logs,
        });
      }).pipe(Effect.uninterruptible);

    const result = yield* Effect.gen(function* () {
      if (route === undefined) {
        return yield* new ApiRequestError({
          status: 404,
          message: "No mock endpoint matches this request",
        });
      }
      const text = yield* request.text.pipe(
        Effect.mapError(
          () =>
            new ApiRequestError({
              status: 413,
              message: "Request body could not be read within the size limit",
            })
        )
      );
      if (
        text &&
        !JSON_CONTENT_TYPE.test(
          request.headers["content-type"]?.split(";")[0]?.trim() ?? ""
        )
      ) {
        return yield* new ApiRequestError({
          status: 415,
          message: "Expected a JSON request body",
        });
      }
      const body =
        text === ""
          ? null
          : yield* Schema.decodeUnknown(Json)(text).pipe(
              Effect.mapError(
                () =>
                  new ApiRequestError({
                    status: 400,
                    message: "Invalid JSON request body",
                  })
              )
            );
      input = { ...fields, body };
      return yield* endpointResponse(route, input, (value) => {
        if (logs.length < 64) {
          logs.push(captureLog(value));
        }
      });
    }).pipe(
      Effect.catchTags({
        ApiRequestError: ({ status, message }) =>
          Effect.succeed({
            status,
            body: JSON.stringify({ message }),
            headers: undefined,
            error: null,
          }),
        ApiMockError: ({ message }) =>
          Effect.succeed({
            status: 500,
            body: JSON.stringify({ message }),
            headers: undefined,
            error: message,
          }),
      }),
      Effect.onInterrupt(() =>
        save(499, null, "Request cancelled").pipe(Effect.orDie)
      )
    );
    const { status, headers, body, error } = result;
    const empty = request.method === "HEAD" || bodyless(status);
    yield* save(
      status,
      { status, headers, body: empty ? null : JSON.parse(body) },
      error
    );
    return empty
      ? HttpServerResponse.empty({ status, headers })
      : HttpServerResponse.text(body, {
          status,
          headers,
          contentType: "application/json",
        });
  }).pipe(
    HttpServerRequest.withMaxBodySize(Option.some(1_048_576)),
    Effect.withSpan("ApiMock.request")
  );
