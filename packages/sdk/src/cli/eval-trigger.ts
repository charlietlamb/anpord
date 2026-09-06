import { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import { Config, Effect, Schema } from "effect";

export const evalTrigger = Effect.gen(function* () {
  const github = yield* Config.boolean("GITHUB_ACTIONS").pipe(
    Config.withDefault(false)
  );
  const ci = yield* Config.boolean("CI").pipe(Config.withDefault(false));
  if (!github) {
    return { source: ci ? "ci" : "cli" } satisfies EvalTrigger;
  }
  const repository = yield* Config.string("GITHUB_REPOSITORY");
  const runId = yield* Config.string("GITHUB_RUN_ID");
  const attempt = yield* Config.string("GITHUB_RUN_ATTEMPT").pipe(
    Config.withDefault("1")
  );
  const server = yield* Config.string("GITHUB_SERVER_URL").pipe(
    Config.withDefault("https://github.com")
  );
  return yield* Schema.decodeUnknown(EvalTrigger)({
    source: "ci",
    url: `${server}/${repository}/actions/runs/${runId}/attempts/${attempt}`,
  });
});
