import { expect, test } from "bun:test";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpServer,
} from "@effect/platform";
import { Cause, Effect, Layer, Logger, Schema } from "effect";
import { buildApiHandler } from "../../src/routes/api-handler";

const Api = HttpApi.make("probe").add(
  HttpApiGroup.make("probe")
    .add(HttpApiEndpoint.get("broken", "/broken").addSuccess(Schema.String))
    .add(
      HttpApiEndpoint.get("missing", "/missing")
        .addSuccess(Schema.String)
        .addError(HttpApiError.NotFound)
    )
);

const served = async (path: string) => {
  const logged: string[] = [];
  const capture = Logger.replace(
    Logger.defaultLogger,
    Logger.make(({ cause, logLevel, message }) => {
      logged.push(
        `${logLevel.label} ${String(message)} ${Cause.isEmpty(cause) ? "" : Cause.pretty(cause).split("\n")[0]}`.trim()
      );
    })
  );
  const probe = HttpApiBuilder.group(Api, "probe", (handlers) =>
    handlers
      .handle("broken", () =>
        Effect.die(
          new Error("column eval_case_version.max_turns does not exist")
        )
      )
      .handle("missing", () => Effect.fail(new HttpApiError.NotFound()))
  );
  const live = HttpApiBuilder.api(Api).pipe(
    Layer.provide(probe),
    Layer.provideMerge(HttpServer.layerContext),
    Layer.provide(capture)
  );
  const status = await Effect.runPromise(
    Effect.gen(function* () {
      const { handler } = yield* buildApiHandler(
        live,
        yield* Layer.makeMemoMap
      );
      const response = yield* Effect.promise(() =>
        handler(new Request(`http://localhost${path}`))
      );
      return response.status;
    }).pipe(Effect.scoped)
  );
  return { logged, status };
};

test("a request that dies answers 500 and logs what killed it", async () => {
  expect(await served("/broken")).toEqual({
    logged: [
      "ERROR GET /broken failed Error: column eval_case_version.max_turns does not exist",
    ],
    status: 500,
  });
});

test("a request that fails with an answer it declares logs nothing", async () => {
  expect(await served("/missing")).toEqual({ logged: [], status: 404 });
});
