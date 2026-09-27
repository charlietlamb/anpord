import { callSubjectOf, commandText } from "@anpord/schema/domain/eval-journal";
import type { EvalJournalEntry } from "@anpord/schema/domain/eval-trial";
import {
  describeCommand,
  describeStep,
} from "@anpord/schema/domain/step-title";
import { formatDuration } from "./duration";
import type { Palette } from "./paint";
import { clipped, flat, type Writer } from "./transcript-writer";

type Step = Exclude<EvalJournalEntry, { readonly _tag: "message" }>;

interface StepParts {
  readonly detail: string;
  readonly failure: string | null;
  readonly tookMs: number | null;
  readonly verb: string;
}

const BRANCH_WIDTH = 2;
const VERB_WIDTH = 7;
const NOTABLE_MS = 1000;
const GAP = "  ";

const VERB_TONES: Readonly<Record<string, keyof Palette>> = {
  ran: "sand",
  read: "slate",
  search: "teal",
  wrote: "rose",
};

const unless = (text: string, tone: (text: string) => string) =>
  text === "" ? "" : tone(text);

const tookBetween = (
  startedAt: number | null | undefined,
  finishedAt: number | null
) =>
  startedAt === null || startedAt === undefined || finishedAt === null
    ? null
    : Math.max(0, finishedAt - startedAt);

const commandParts = (step: Extract<Step, { _tag: "command" }>): StepParts => {
  const title = describeCommand(step.command);
  const named = title.verb === "read" || title.verb === "wrote";

  return {
    detail: named
      ? (title.target ?? title.title)
      : flat(commandText(step.command)),
    failure:
      step.exitCode !== null && step.exitCode !== 0
        ? `exit ${step.exitCode}`
        : null,
    tookMs: tookBetween(step.startedAtMillis, step.finishedAtMillis),
    verb: title.verb === "searched" ? "search" : title.verb,
  };
};

const partsOf = (step: Step): StepParts => {
  if (step._tag === "command") {
    return commandParts(step);
  }

  if (step._tag === "fileChange") {
    return {
      detail: describeStep(step).target ?? "",
      failure: null,
      tookMs: null,
      verb: "wrote",
    };
  }

  return {
    detail: flat(callSubjectOf(step.input) ?? ""),
    failure: step.error === undefined ? null : "failed",
    tookMs: tookBetween(step.startedAtMillis, step.finishedAtMillis),
    verb: step.name,
  };
};

export const stepLine = (step: Step, { branch, paint, room }: Writer) => {
  const { detail, failure, tookMs, verb } = partsOf(step);
  const took =
    tookMs === null || tookMs < NOTABLE_MS
      ? ""
      : `${GAP}${formatDuration(tookMs)}`;
  const failed = failure === null ? "" : `${GAP}✗ ${failure}`;
  const label = verb.padEnd(VERB_WIDTH);
  const width =
    room - BRANCH_WIDTH - label.length - 1 - took.length - failed.length;
  const tone =
    failure === null ? paint[VERB_TONES[verb] ?? "lavender"] : paint.red;

  return branch(
    `${tone(label)} ${clipped(detail, Math.max(1, width))}${unless(took, paint.dim)}${unless(failed, paint.red)}`
  );
};
