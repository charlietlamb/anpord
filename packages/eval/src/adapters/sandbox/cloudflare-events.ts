import type { HttpClientResponse } from "@effect/platform";
import { Effect, Option, Schema, Stream } from "effect";
import { unavailable } from "./cloudflare-bridge";
import type { ExecSink } from "./exec-stream";

const ExitEvent = Schema.parseJson(Schema.Struct({ exit_code: Schema.Number }));
const ErrorEvent = Schema.parseJson(Schema.Struct({ error: Schema.String }));

const NO_LINES: readonly string[] = [];

interface ServerEvent {
  readonly data: string;
  readonly event: string | undefined;
}

const eventOf = (lines: readonly string[]): ServerEvent => ({
  data: lines
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6))
    .join("\n"),
  event: lines.find((line) => line.startsWith("event: "))?.slice(7),
});

const decoded = <A>(schema: Schema.Schema<A, string>, data: string) =>
  Schema.decode(schema)(data).pipe(Effect.mapError(unavailable));

const applied =
  (sink: ExecSink) =>
  (exitCode: Option.Option<number>, { data, event }: ServerEvent) => {
    if (event === "stdout" || event === "stderr") {
      return Effect.sync(() =>
        sink[event](Buffer.from(data, "base64").toString())
      ).pipe(Effect.as(exitCode));
    }
    if (event === "exit") {
      return decoded(ExitEvent, data).pipe(
        Effect.map((exit) => Option.some(exit.exit_code))
      );
    }
    if (event === "error") {
      return decoded(ErrorEvent, data).pipe(
        Effect.flatMap((failure) => Effect.fail(unavailable(failure.error)))
      );
    }
    return Effect.succeed(exitCode);
  };

export const readEvents = (
  response: HttpClientResponse.HttpClientResponse,
  sink: ExecSink
) =>
  response.stream.pipe(
    Stream.mapError(unavailable),
    Stream.decodeText(),
    Stream.splitLines,
    Stream.mapAccum(NO_LINES, (pending, line) =>
      line === "" ? [NO_LINES, [eventOf(pending)]] : [[...pending, line], []]
    ),
    Stream.flattenIterables,
    Stream.runFoldEffect(Option.none<number>(), applied(sink)),
    Effect.flatMap(
      Option.match({
        onNone: () =>
          Effect.fail(
            unavailable("Cloudflare command stream ended without an exit code")
          ),
        onSome: Effect.succeed,
      })
    )
  );
