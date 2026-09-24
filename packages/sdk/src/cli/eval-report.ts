import { FileSystem } from "@effect/platform";
import { Config, Effect, Option, Schema } from "effect";
import { webUrlConfig } from "../client/config";
import { batchUrl, buildGithubCheck } from "./github-check";
import { note } from "./render";
import { SuiteOutcome } from "./suite-outcome";

const reportJson = Schema.encodeSync(
  Schema.parseJson(Schema.Array(SuiteOutcome))
);

const appendSummary = (text: string) =>
  Effect.gen(function* () {
    const path = yield* Config.string("GITHUB_STEP_SUMMARY").pipe(
      Config.option
    );
    if (Option.isSome(path) && path.value !== "") {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(path.value, `${text}\n\n`, { flag: "a" });
    }
  });

export const reportStarted = (label: string, id: string) =>
  Effect.gen(function* () {
    const url = batchUrl(yield* webUrlConfig, id);
    yield* note(`${label}: ${url}`);
    yield* appendSummary(`[Batch ${id}](${url}) started.`);
  });

export const writeReport = (
  outcomes: readonly SuiteOutcome[],
  path: Option.Option<string>
) =>
  Effect.gen(function* () {
    if (Option.isSome(path)) {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(path.value, reportJson(outcomes));
    }
  });

export const reportFinished = (outcomes: readonly SuiteOutcome[]) =>
  Effect.gen(function* () {
    const report = buildGithubCheck(outcomes, yield* webUrlConfig);
    yield* appendSummary(
      `## ${report.output.title}\n\n${report.output.summary}`
    );
  });
