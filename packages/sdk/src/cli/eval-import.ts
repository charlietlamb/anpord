import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect, Option } from "effect";
import type { ImportTally } from "../imports/evals-json-render";
import { FORMATS } from "./import-formats";
import { note, row } from "./render";

const caseFile = Args.file({ name: "file" }).pipe(
  Args.withDescription("The case file to read")
);

const format = Options.choiceWithValue("format", FORMATS).pipe(
  Options.withDescription("The case file's format")
);

const out = Options.file("out").pipe(
  Options.withDescription(
    "Where to write the suite; it goes to stdout when omitted"
  ),
  Options.optional
);

const plural = (count: number, one: string) =>
  `${count} ${count === 1 ? one : `${one}s`}`;

/** The count of unwritten checks leads, because a suite that reports a pass
 * for a check nobody wrote is the failure this product exists to prevent. */
export const summaryOf = (tally: ImportTally) => {
  const read = `Read ${plural(tally.cases, "case")}, converted ${plural(tally.converted, "assertion")}.`;

  return tally.needsAuthor === 0
    ? read
    : `${read} ${plural(tally.needsAuthor, "assertion")} could not be converted and ${tally.needsAuthor === 1 ? "needs" : "need"} a human: each is written as prose, and the suite fails until you write the check it describes.`;
};

export const importEval = Command.make(
  "import",
  { caseFile, format, out },
  ({ caseFile: path, format: read, out: destination }) =>
    Effect.gen(function* () {
      const suite = yield* read(path);

      yield* Option.match(destination, {
        onNone: () => row(suite.source.trimEnd()),
        onSome: (target) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            yield* fs.writeFileString(target, suite.source);
            yield* note(`Wrote ${target}`);
          }),
      });

      return yield* note(summaryOf(suite.tally));
    })
).pipe(
  Command.withDescription("Turn a case file a team already wrote into a suite")
);
