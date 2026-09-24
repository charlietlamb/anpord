import { EvalCaseId } from "@anpord/schema/domain/eval-limits";
import { Args, Command, Options } from "@effect/cli";
import { Data, Effect, Option, Schema } from "effect";
import { ClientLayer } from "../client/config";
import type { HostedOptions } from "./batch-outcome";
import { evalFilesIn } from "./eval-files";
import { EvalGate, NoEvalFiles } from "./eval-gate";
import { importEval } from "./eval-import";
import { runHosted } from "./hosted-report";
import { runStoredCase, runSuiteFile } from "./suite-hosted";
import { runSuitesLocally } from "./suite-local";
import type { Selection } from "./suite-selection";

const DEFAULT_TIMEOUT_SECONDS = 1200;

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print each finished batch as JSON")
);
const evalFile = Args.text({ name: "file" }).pipe(
  Args.withDescription(
    "A TypeScript eval file; discovers *.eval.ts when omitted"
  ),
  Args.optional
);
const noWait = Options.boolean("no-wait").pipe(
  Options.withDescription("Start batches without waiting")
);
const failOn = Options.choice("fail-on", EvalGate.literals).pipe(
  Options.withDescription(
    "failures fails on any run whose trials did not all pass, strict also requires every expected run and trial, never only fails a batch that did not finish"
  ),
  Options.withDefault("failures" as const)
);
const timeout = Options.integer("timeout").pipe(
  Options.withDescription(
    `Maximum seconds to wait per batch, ${DEFAULT_TIMEOUT_SECONDS} unless set`
  ),
  Options.withSchema(Schema.Int.pipe(Schema.positive())),
  Options.optional
);
const local = Options.boolean("local").pipe(
  Options.withDescription(
    "Run every case on every variant on this machine instead of a cloud sandbox"
  )
);
const output = Options.text("output").pipe(
  Options.withDescription("Write a JSON report to this file"),
  Options.optional
);
const caseId = Options.text("case").pipe(
  Options.withDescription(
    "Run one case. With a file, picks that case from it; without one, runs the stored case again"
  ),
  Options.withSchema(EvalCaseId),
  Options.optional
);
const variant = Options.text("variant").pipe(
  Options.withDescription(
    "Run one variant: a variant id for a stored case, or harness/model for a file. Repeat for more"
  ),
  Options.repeated
);

class LocalRefused extends Data.TaggedError("LocalRefused")<{
  readonly reason: string;
}> {
  override get message() {
    return this.reason;
  }
}

const localRefusal = (flags: {
  readonly file: Option.Option<string>;
  readonly selection: Selection;
  readonly skipWait: boolean;
  readonly wantsJson: boolean;
  readonly path: Option.Option<string>;
}) => {
  if (Option.isSome(flags.selection.caseId) && Option.isNone(flags.file)) {
    return Option.some(
      "--local runs a suite file. Name the file that holds the case."
    );
  }
  if (flags.skipWait) {
    return Option.some("--local always waits, so it cannot take --no-wait.");
  }
  if (flags.wantsJson) {
    return Option.some(
      "--local prints a transcript, so it cannot take --json."
    );
  }
  return Option.isSome(flags.path)
    ? Option.some(
        "--local does not write a report, so it cannot take --output."
      )
    : Option.none();
};

const filesFrom = (file: Option.Option<string>) =>
  Effect.gen(function* () {
    const files = yield* Option.match(file, {
      onNone: () => evalFilesIn("."),
      onSome: (one) => Effect.succeed([one] as readonly string[]),
    });

    if (files.length === 0) {
      return yield* new NoEvalFiles();
    }

    return files;
  });

const runHostedEvals = (
  file: Option.Option<string>,
  selection: Selection,
  options: HostedOptions & { readonly path: Option.Option<string> }
) =>
  Effect.gen(function* () {
    if (Option.isSome(selection.caseId) && Option.isNone(file)) {
      const stored = selection.caseId.value;
      return yield* runHosted(
        [(save) => runStoredCase(stored, selection.variants, options, save)],
        options
      );
    }

    const files = yield* filesFrom(file);

    return yield* runHosted(
      files.map((one) => (save) => runSuiteFile(one, selection, options, save)),
      options
    );
  }).pipe(Effect.provide(ClientLayer));

export const runEval = Command.make(
  "eval",
  {
    asJson,
    caseId,
    evalFile,
    failOn,
    local,
    noWait,
    output,
    timeout,
    variant,
  },
  (flags) =>
    Effect.gen(function* () {
      const selection: Selection = {
        caseId: flags.caseId,
        variants: flags.variant,
      };

      if (!flags.local) {
        return yield* runHostedEvals(flags.evalFile, selection, {
          gate: flags.failOn,
          path: flags.output,
          skipWait: flags.noWait,
          timeoutSeconds: Option.getOrElse(
            flags.timeout,
            () => DEFAULT_TIMEOUT_SECONDS
          ),
          wantsJson: flags.asJson,
        });
      }

      const refused = localRefusal({
        file: flags.evalFile,
        path: flags.output,
        selection,
        skipWait: flags.noWait,
        wantsJson: flags.asJson,
      });
      if (Option.isSome(refused)) {
        return yield* new LocalRefused({ reason: refused.value });
      }

      return yield* runSuitesLocally(
        yield* filesFrom(flags.evalFile),
        selection,
        {
          gate: flags.failOn,
          timeoutSeconds: flags.timeout,
        }
      );
    })
).pipe(
  Command.withDescription(
    "Run suite files, or a stored case, as batches and gate on the results"
  ),
  Command.withSubcommands([importEval])
);
