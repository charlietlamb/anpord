import {
  API_CALL_LIMIT,
  API_JOURNAL,
  API_MANIFEST,
  API_READY,
  type ApiCall,
} from "@anpord/schema/domain/api-mocks";
import { FileSystem } from "@effect/platform";
import { layer as fileSystemLayer } from "@effect/platform-node/NodeFileSystem";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Deferred, Effect, Ref } from "effect";
import type { ApiDefinition } from "./define";
import { ApiMockError } from "./errors";
import { startApi } from "./server";

export const withApi = <A>({
  api,
  run,
}: {
  readonly api: ApiDefinition;
  readonly run: (context: {
    readonly url: string;
    readonly calls: () => Promise<readonly ApiCall[]>;
  }) => Promise<A>;
}): Promise<A> =>
  Effect.gen(function* () {
    const calls = yield* Ref.make<readonly ApiCall[]>([]);
    const fatal = yield* Deferred.make<never, ApiMockError>();
    const server = yield* startApi(api, (call) =>
      Ref.modify(calls, (values) => [
        values.length < API_CALL_LIMIT,
        values.length < API_CALL_LIMIT ? [...values, call] : values,
      ]).pipe(
        Effect.flatMap((recorded) =>
          recorded
            ? Effect.void
            : Deferred.fail(
                fatal,
                new ApiMockError({ message: "API request limit exceeded" })
              ).pipe(Effect.asVoid)
        )
      )
    );
    const result = yield* Effect.tryPromise({
      try: () =>
        run({
          url: server.url,
          calls: () => Effect.runPromise(Ref.get(calls)),
        }),
      catch: (cause) => cause,
    }).pipe(Effect.raceFirst(Deferred.await(fatal)));
    const recorded = yield* Ref.get(calls);
    if (recorded.some((call) => call.error !== null)) {
      return yield* new ApiMockError({
        message: "An API endpoint failed during execution",
      });
    }
    return result;
  }).pipe(Effect.scoped, Effect.withSpan("ApiMock.withApi"), Effect.runPromise);

export const runApiServers = (definitions: readonly ApiDefinition[]): void =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const fatal = yield* Deferred.make<never, ApiMockError>();
    yield* fs.makeDirectory(".anpord/api", { recursive: true });
    yield* fs.writeFileString(API_JOURNAL, "");
    const lock = yield* Effect.makeSemaphore(1);
    const count = yield* Ref.make(0);
    const record = (call: ApiCall) =>
      Effect.gen(function* () {
        const index = yield* Ref.getAndUpdate(count, (value) => value + 1);
        if (index >= API_CALL_LIMIT) {
          return yield* new ApiMockError({
            message: "API request limit exceeded",
          });
        }
        yield* fs.writeFileString(API_JOURNAL, `${JSON.stringify(call)}\n`, {
          flag: "a",
        });
      }).pipe(
        Effect.mapError(
          () =>
            new ApiMockError({
              message: "API request evidence could not be written",
            })
        ),
        Effect.tapError((cause) => Deferred.fail(fatal, cause)),
        lock.withPermits(1)
      );
    const manifest = yield* Effect.forEach(definitions, (definition) =>
      startApi(definition, record)
    );
    yield* fs.writeFileString(API_MANIFEST, JSON.stringify(manifest));
    yield* Effect.sync(() =>
      process.stdout.write(`${API_READY}${JSON.stringify(manifest)}\n`)
    );
    yield* Deferred.await(fatal);
  }).pipe(
    Effect.scoped,
    Effect.provide(fileSystemLayer),
    Effect.withSpan("ApiMock.serve"),
    runMain
  );
