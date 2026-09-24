import { Effect, Option } from "effect";
import { webUrlConfig } from "../client/config";
import { asAnpordError } from "../client/errors";
import { failWhen } from "./eval-gate";
import { reportFinished, writeReport } from "./eval-report";
import { buildGithubCheck } from "./github-check";
import { postCheckRun } from "./github-check-client";
import { githubContext } from "./github-context";
import { note } from "./render";
import {
  outcomeLabel,
  type SaveOutcome,
  type SuiteOutcome,
} from "./suite-outcome";

type HostedJob<E, R> = (save: SaveOutcome) => Effect.Effect<SuiteOutcome, E, R>;

const reportToGithub = (outcomes: readonly SuiteOutcome[]) =>
  Effect.gen(function* () {
    const context = yield* githubContext;
    if (Option.isNone(context)) {
      return;
    }
    const webUrl = yield* webUrlConfig;
    yield* postCheckRun(context.value, buildGithubCheck(outcomes, webUrl));
  }).pipe(
    Effect.catchAll((error) =>
      note(`The GitHub check was not posted. ${asAnpordError(error).message}`)
    )
  );

const conclude = (outcomes: readonly SuiteOutcome[]) =>
  failWhen(
    outcomes.flatMap((outcome) =>
      outcome.error === null
        ? []
        : [`${outcomeLabel(outcome)}: ${outcome.error}`]
    ),
    outcomes.flatMap((outcome) => outcome.problems)
  );

export const runHosted = <E, R>(
  jobs: readonly HostedJob<E, R>[],
  options: {
    readonly path: Option.Option<string>;
    readonly skipWait: boolean;
  }
) =>
  Effect.gen(function* () {
    const outcomes: SuiteOutcome[] = [];

    yield* Effect.forEach(jobs, (job, index) =>
      Effect.gen(function* () {
        const save = (outcome: SuiteOutcome) =>
          Effect.gen(function* () {
            outcomes[index] = outcome;
            yield* writeReport(outcomes, options.path);
          }).pipe(Effect.orDie);

        yield* save(yield* job(save));
      })
    );

    yield* reportFinished(outcomes);
    if (!options.skipWait) {
      yield* reportToGithub(outcomes);
    }

    return yield* conclude(outcomes);
  });
