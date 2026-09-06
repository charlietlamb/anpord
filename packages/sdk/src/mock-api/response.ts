import { Effect, Schema } from "effect";
import type { ApiHandlerContext, EndpointDefinition } from "./define";
import { ApiMockError, ApiRequestError } from "./errors";
import { decodeStandard } from "./standard-schema";

const HeaderName = Schema.String.pipe(
  Schema.pattern(/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/),
  Schema.filter(
    (name) =>
      !["content-length", "transfer-encoding", "content-type"].includes(
        name.toLowerCase()
      )
  )
);
const Response = Schema.Struct({
  status: Schema.Int,
  body: Schema.Unknown,
  headers: Schema.optional(
    Schema.Record({
      key: HeaderName,
      value: Schema.String.pipe(Schema.pattern(/^[\t\x20-\x7e\x80-\xff]*$/)),
    })
  ),
});

export const bodyless = (status: number) => [204, 205, 304].includes(status);

export const endpointResponse = (
  route: EndpointDefinition,
  input: unknown,
  log: ApiHandlerContext["log"]
) =>
  Effect.gen(function* () {
    const decoded = yield* decodeStandard(route.inputSchema, input).pipe(
      Effect.mapError(
        () =>
          new ApiRequestError({
            status: 400,
            message: "Request does not match the endpoint schema",
          })
      )
    );
    const returned = yield* Effect.tryPromise({
      try: (signal) => Promise.resolve(route.handler(decoded, { signal, log })),
      catch: () => new ApiMockError({ message: "Endpoint handler threw" }),
    }).pipe(
      Effect.timeoutFail({
        duration: "30 seconds",
        onTimeout: () =>
          new ApiMockError({ message: "Endpoint handler timed out" }),
      })
    );
    const response = yield* Schema.decodeUnknown(Response)(returned).pipe(
      Effect.mapError(
        () => new ApiMockError({ message: "Invalid endpoint response" })
      )
    );
    const schema = route.responses[response.status];
    if (schema === undefined) {
      return yield* new ApiMockError({
        message: "Endpoint returned an undeclared status",
      });
    }
    const output = yield* decodeStandard(schema, response.body);
    if (bodyless(response.status) && output !== null) {
      return yield* new ApiMockError({
        message: "This HTTP status cannot carry a response body",
      });
    }
    const body = yield* Effect.try({
      try: () => {
        const text = JSON.stringify(output);
        if (text === undefined) {
          throw new Error("Response body is undefined");
        }
        return text;
      },
      catch: () =>
        new ApiMockError({ message: "Response is not JSON serializable" }),
    });
    return { ...response, body, error: null };
  });
