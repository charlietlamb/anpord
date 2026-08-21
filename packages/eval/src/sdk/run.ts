import { Chunk, Effect, Stream } from "effect";
import type { Distribution } from "../domain/distribution";
import { distributionOf } from "../domain/distribution";
import { UnreadableHarness } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { parseHarness } from "../domain/harness-spec";
import type { TrialOutcome } from "../domain/trial";
import type { SandboxHandle } from "../ports/sandbox";
import {
  type Case,
  casesOf,
  type EvalDefinition,
  type Evidence,
  type Score,
  trialsOf,
} from "./define";

export interface CellReport {
  readonly caseName: string;
  readonly distribution: Distribution;
  readonly scores: readonly (readonly Score[])[];
  readonly variant: string;
}

export interface EvalReport {
  readonly cells: readonly CellReport[];
  readonly name: string;
}

/**
 * What a scorer is given, built where the trial ran.
 *
 * `exec` returns an Effect rather than a Promise so a dead sandbox fails
 * instead of being folded into an exit code: escaping the runtime here also
 * severed interruption, so a cancelled trial left its scorer running against
 * a workspace the scope was already deleting.
 */
export const evidenceFrom = (input: {
  readonly events: readonly HarnessEvent[];
  readonly sandbox: SandboxHandle;
}): Evidence => ({
  events: input.events,
  exec: (command: string) =>
    Stream.runCollect(input.sandbox.exec(command)).pipe(
      Effect.map(Chunk.toReadonlyArray),
      Effect.map((chunks) => ({
        /* A stream that ended without an exit chunk never told us how it
           went, and reading that as success is the vacuous pass this
           product exists to catch. */
        exitCode:
          chunks.find((chunk) => chunk.stream === "exit")?.exitCode ?? 1,
        output: chunks
          .flatMap((chunk) => (chunk.stream === "exit" ? [] : [chunk.data]))
          .join(""),
      })),
      Effect.withSpan("Evidence.exec", { attributes: { command } })
    ),
});

/**
 * A trial's verdict from its scores.
 *
 * Every score has to hold, matching how WebArena composes its evaluators: a
 * task is not three quarters done. A scorer that declined is not counted
 * against the agent, and a trial where every scorer declined has no evidence
 * at all, which is what void means.
 */
export const outcomeFrom = (input: {
  readonly commandCount: number;
  readonly modelMs: number;
  readonly sandboxMs: number;
  readonly scores: readonly Score[];
}): TrialOutcome => {
  const answered = input.scores.filter((score) => score.score !== null);
  const passed =
    answered.length > 0 && answered.every((score) => (score.score ?? 0) >= 1);

  const statusOf = () => {
    if (answered.length === 0) {
      return "void" as const;
    }

    return passed ? ("passed" as const) : ("failed" as const);
  };

  return {
    commandCount: input.commandCount,
    exitCode: passed ? 0 : 1,
    modelMs: input.modelMs,
    passed,
    sandboxMs: input.sandboxMs,
    status: statusOf(),
    voidFields: answered.length === 0 ? ["scores"] : [],
  };
};

export const variantName = (variant: {
  readonly harness: string;
  readonly model: string;
  readonly name?: string;
  readonly provider: string;
}) =>
  variant.name ?? `${variant.harness} ${variant.model} on ${variant.provider}`;

/**
 * Every variant, with its harness read.
 *
 * Fails rather than throwing. UnreadableHarness is a tagged error built to
 * travel in an error channel, and throwing it made it a defect: a caller
 * could not catch it by tag, and it killed the whole run past any per-cell
 * recovery. Validated rather than short-circuited, so a file with three
 * typos reports three rather than one at a time.
 */
export const resolveVariants = (
  variants: readonly {
    readonly harness: string;
    readonly model: string;
    readonly name?: string;
    readonly provider: string;
  }[]
) =>
  Effect.validateAll(variants, (variant) => {
    const harness = parseHarness(variant.harness);

    return harness === null
      ? Effect.fail(new UnreadableHarness({ spec: variant.harness }))
      : Effect.succeed({ ...variant, harness, label: variantName(variant) });
  }).pipe(Effect.withSpan("Eval.resolveVariants"));

/** The grid a definition expands to, before anything runs. Separated so a
 * caller can count what a run will cost without starting it. */
export const planOf = async (
  definition: EvalDefinition
): Promise<readonly { readonly subject: Case; readonly variant: string }[]> => {
  const cases = await casesOf(definition);

  return definition.variants.flatMap((variant) =>
    cases.map((subject) => ({ subject, variant: variantName(variant) }))
  );
};

export const reportOf = (input: {
  readonly cells: readonly {
    readonly caseName: string;
    readonly outcomes: readonly TrialOutcome[];
    readonly scores: readonly (readonly Score[])[];
    readonly variant: string;
  }[];
  readonly name: string;
}): EvalReport => ({
  cells: input.cells.map((cell) => ({
    caseName: cell.caseName,
    distribution: distributionOf(cell.outcomes),
    scores: cell.scores,
    variant: cell.variant,
  })),
  name: input.name,
});

export const trialCountOf = trialsOf;
