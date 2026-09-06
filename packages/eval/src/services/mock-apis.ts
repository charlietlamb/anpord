import {
  API_JOURNAL,
  API_PROGRAM,
  API_READY,
  ApiCall,
  ApiManifest,
  ApiProgram,
} from "@anpord/schema/domain/api-mocks";
import {
  Deferred,
  Effect,
  Fiber,
  Option,
  Ref,
  Schema,
  type Scope,
  Stream,
} from "effect";
import { PrepareFailed } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import type { RequestedProfile } from "../domain/harness-profile";
import type { SandboxHandle } from "../ports/sandbox";

const failure = (reason: string) =>
  new PrepareFailed({ name: "API mocks", reason });
const quoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

interface MockApis {
  readonly check: Effect.Effect<void, PrepareFailed>;
  readonly collect: () => Effect.Effect<readonly HarnessEvent[], PrepareFailed>;
  readonly manifest: ApiManifest;
}

const eventOf = (call: ApiCall): HarnessEvent => ({
  _tag: "ToolCall",
  at: call.startedAt + call.durationMs,
  startedAt: call.startedAt,
  callId: `api:${call.api}:${call.index}`,
  name: `${call.api} ${call.method} ${call.path}`,
  input: call.input.text,
  output: call.output.text,
  ...(call.error === null ? {} : { error: call.error }),
  status: call.error === null && call.status < 400 ? "completed" : "error",
});

export const startMockApis = (input: {
  readonly profile: RequestedProfile | null;
  readonly sandbox: SandboxHandle;
  readonly workspace: string;
}): Effect.Effect<MockApis, PrepareFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const encoded = input.profile?.files[API_PROGRAM];
    if (encoded === undefined) {
      return {
        manifest: [],
        collect: () => Effect.succeed<readonly HarnessEvent[]>([]),
        check: Effect.void,
      };
    }
    const program = yield* Schema.decodeUnknown(Schema.parseJson(ApiProgram))(
      encoded
    ).pipe(Effect.mapError(() => failure("Invalid API program manifest")));
    const ready = yield* Deferred.make<ApiManifest, PrepareFailed>();
    const failed = yield* Ref.make(false);
    const collected = yield* Ref.make(0);
    const consume = (line: string) =>
      Effect.gen(function* () {
        if (line.startsWith(API_READY)) {
          const manifest = yield* Schema.decodeUnknown(
            Schema.parseJson(ApiManifest)
          )(line.slice(API_READY.length));
          yield* Deferred.succeed(ready, manifest);
        }
      }).pipe(Effect.mapError(() => failure("Invalid API runtime evidence")));
    const process = yield* input.sandbox
      .exec(`node ${quoted(program.entry)}`, {
        cwd: input.workspace,
        timeoutMs: 3_600_000,
      })
      .pipe(
        Stream.filterMap((chunk) =>
          chunk.stream === "stdout" ? Option.some(chunk.data) : Option.none()
        ),
        Stream.splitLines,
        Stream.runForEach(consume),
        Effect.zipRight(
          Effect.fail(
            failure("API mock process exited before trial completion")
          )
        ),
        Effect.mapError((cause) =>
          cause._tag === "PrepareFailed"
            ? cause
            : failure("API mock process failed")
        ),
        Effect.tapError((error) => Deferred.fail(ready, error)),
        Effect.forkScoped
      );
    const manifest = yield* Deferred.await(ready).pipe(
      Effect.timeoutFail({
        duration: "30 seconds",
        onTimeout: () => failure("API mocks did not become ready"),
      })
    );
    const collect = () =>
      Effect.gen(function* () {
        const recorded = yield* input.sandbox
          .exec(`cat ${quoted(API_JOURNAL)}`, {
            cwd: input.workspace,
            timeoutMs: 30_000,
          })
          .pipe(
            Stream.mapEffect((chunk) =>
              chunk.stream === "exit" && chunk.exitCode !== 0
                ? Effect.fail(failure("API request evidence could not be read"))
                : Effect.succeed(chunk.stream === "stdout" ? chunk.data : "")
            ),
            Stream.splitLines,
            Stream.filter((line) => line !== ""),
            Stream.mapEffect(Schema.decodeUnknown(Schema.parseJson(ApiCall))),
            Stream.runCollect,
            Effect.map((chunk) => Array.from(chunk)),
            Effect.mapError(() =>
              failure("Invalid or missing API request evidence")
            )
          );
        yield* Ref.set(
          failed,
          recorded.some((call) => call.error !== null)
        );
        const from = yield* Ref.getAndSet(collected, recorded.length);
        return recorded.slice(from).map(eventOf);
      });
    const check = Effect.gen(function* () {
      if (Option.isSome(yield* Fiber.poll(process))) {
        return yield* failure("API mock process stopped during the trial");
      }
      if (yield* Ref.get(failed)) {
        return yield* failure(
          "An API mock handler failed; inspect the request evidence"
        );
      }
    });
    return { manifest, collect, check };
  }).pipe(Effect.withSpan("MockApis.start"));

export const apiInstructions = (manifest: ApiManifest) =>
  manifest.length === 0
    ? ""
    : `\n\nLocal mock APIs (use these URLs, not external services):\n${manifest.map((api) => `${api.name}: ${api.url}\n${api.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}${endpoint.description ? `: ${endpoint.description}` : ""}`).join("\n")}`).join("\n")}`;
