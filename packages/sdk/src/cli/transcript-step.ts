import { callSubjectOf, commandText } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { clipped, flat, type Writer } from "./transcript-writer";

type Step = Exclude<EvalJournalEntry, { readonly _tag: "message" }>;

const GLYPH_WIDTH = 2;

export const stepLine = (step: Step, { line, paint, room }: Writer) => {
  const width = room - GLYPH_WIDTH;

  if (step._tag === "command") {
    const failed = step.exitCode !== null && step.exitCode !== 0;

    return line(
      `${paint.yellow("$")} ${paint.dim(clipped(flat(commandText(step.command)), width))}${failed ? paint.red(` exit ${step.exitCode}`) : ""}`
    );
  }

  if (step._tag === "fileChange") {
    return line(
      `${paint.green("+")} ${paint.dim(clipped(`wrote ${step.paths.join(", ")}`, width))}`
    );
  }

  const subject = callSubjectOf(step.input);
  const detail =
    subject === null
      ? ""
      : ` ${paint.dim(clipped(flat(subject), Math.max(1, width - step.name.length - 1)))}`;

  return line(
    `${paint.blue("●")} ${step.name}${detail}${step.error === undefined ? "" : paint.red(" failed")}`
  );
};
