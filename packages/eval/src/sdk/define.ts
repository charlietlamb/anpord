import type { HarnessName, ProviderName } from "../domain/cell";
import type { HarnessEvent } from "../domain/harness-event";
import type { WorkspaceSource } from "../services/workspace";

/** What a scorer is handed after the agent has finished.
 *
 * The workspace answers whether the end state is right and the journal
 * answers how it got there. Both, because every company in the research
 * scores one of them and none can score the other. */
export interface Evidence {
  readonly events: readonly HarnessEvent[];
  /** Runs a command in the finished sandbox and returns its exit code and
   * output. The workspace is still open, so a scorer can look rather than
   * having to have asked in advance. */
  readonly exec: (
    command: string
  ) => Promise<{ readonly exitCode: number; readonly output: string }>;
}

/** One named judgement.
 *
 * A score is a number rather than a boolean so a partial result can be
 * expressed, and `null` means the scorer declined: no evidence, rather than
 * a zero. That distinction is the void gate in miniature and the reason a
 * missing key never reads as a failure. */
export interface Score {
  readonly evidence?: string;
  readonly name: string;
  readonly score: number | null;
}

/** One score, or several from one pass.
 *
 * Several, because reading a journal is the expensive part and a trajectory
 * usually answers more than one question: how many tools were called, which
 * ones, and what it finished on all come from a single walk. Braintrust
 * allows the same for the same reason. */
export type ScoreResult = Score | readonly Score[];

export type Scorer = (
  evidence: Evidence
) => Promise<ScoreResult> | ScoreResult;

/** Flattens whatever a scorer returned into the list a report reads. */
export const scoresOf = (result: ScoreResult): readonly Score[] =>
  Array.isArray(result) ? result : [result as Score];

export interface Case {
  readonly goal: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly name: string;
  readonly setup?: string;
  readonly source: WorkspaceSource;
}

/** A column of the grid: one harness, one model, one sandbox. */
export interface Variant {
  readonly harness?: HarnessName;
  readonly model: string;
  readonly name?: string;
  readonly provider: ProviderName;
}

export interface EvalDefinition {
  /** The rows. A function so a suite can read them from disk without the
   * file that declares it having to be async. */
  readonly cases: readonly Case[] | (() => Promise<readonly Case[]>);
  readonly name: string;
  /** What the agent is told, with `{{goal}}` replaced per case. The prompt is
   * under test, not part of the case, so editing it compares against the same
   * baseline rather than starting a new history. */
  readonly prompt: string;
  readonly scorers: readonly Scorer[];
  /** Repeated, because one run of a non-deterministic agent is an anecdote.
   * Defaults to three: enough for a spread to mean something, cheap enough
   * that nobody turns it down. */
  readonly trials?: number;
  /** The columns. One is a plain run; several is a comparison, which is how
   * a customer asks whether a model or a harness made any difference. */
  readonly variants: readonly Variant[];
}

/**
 * Declares an eval.
 *
 * Returns the definition rather than running it, so a file that declares one
 * can be imported by a runner, a test, or a script without executing
 * anything. Braintrust's `Eval()` registers and runs as a side effect of
 * import, which reads well in a CLI and badly everywhere else.
 */
export const defineEval = (definition: EvalDefinition): EvalDefinition =>
  definition;

const DEFAULT_TRIALS = 3;

export const trialsOf = (definition: EvalDefinition) =>
  definition.trials ?? DEFAULT_TRIALS;

export const casesOf = async (
  definition: EvalDefinition
): Promise<readonly Case[]> =>
  typeof definition.cases === "function"
    ? await definition.cases()
    : definition.cases;
