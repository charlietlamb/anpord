import type { Effect } from "effect";
import type { ProviderName } from "../domain/cell";
import type { SandboxUnavailable } from "../domain/errors";
import type { HarnessEvent } from "../domain/harness-event";
import { empty, type SourceSpec } from "./source";

export interface CommandResult {
  readonly exitCode: number;
  readonly output: string;
}

export interface Evidence {
  readonly events: readonly HarnessEvent[];
  readonly exec: (
    command: string
  ) => Effect.Effect<CommandResult, SandboxUnavailable>;
}

export interface Score {
  readonly evidence?: string;
  readonly name: string;
  /** `null` is a scorer declining, which is no evidence rather than a zero. */
  readonly score: number | null;
}

export type ScoreResult = Score | readonly Score[];

export type Scorer = (
  evidence: Evidence
) => Effect.Effect<ScoreResult, SandboxUnavailable>;

export const scoresOf = (result: ScoreResult): readonly Score[] =>
  "name" in result ? [result] : result;

export interface Case {
  readonly metadata?: Readonly<Record<string, string>>;
  readonly name: string;
  readonly setup?: string;
  /** Omitted to use the definition's own source, which is the usual shape:
   * every case in a suite tends to be a different task against one
   * repository, not one task against many. */
  readonly source?: SourceSpec;
  readonly variables?: Readonly<Record<string, string>>;
}

export interface Variant {
  /** `codex@0.144.4`. One field, because the cell key is hashed over both and
   * a column naming one without the other compares against a different
   * identity. */
  readonly harness: string;
  readonly model: string;
  readonly name?: string;
  readonly provider: ProviderName;
}

export interface EvalDefinition {
  readonly cases: readonly Case[] | (() => Promise<readonly Case[]>);
  readonly name: string;
  readonly prompt: string;
  readonly scorers: readonly Scorer[];
  /** What every case works on unless it names its own. */
  readonly source?: SourceSpec;
  readonly trials?: number;
  readonly variants: readonly Variant[];
}

/** What a case works on: its own source, the suite's, or nothing. */
export const sourceOf = (definition: EvalDefinition, subject: Case) =>
  subject.source ?? definition.source ?? empty;

/** Returns the definition rather than running it, so a file that declares one
 * can be imported without executing anything. */
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
