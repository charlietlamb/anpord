import type { Distribution } from "../domain/distribution";
import { distributionOf } from "../domain/distribution";
import type { TrialOutcome } from "../domain/trial";
import { type Case, casesOf, type EvalDefinition, type Score } from "./define";
import { variantName } from "./variant";

interface CellReport {
  readonly caseName: string;
  readonly distribution: Distribution;
  readonly scores: readonly (readonly Score[])[];
  readonly variant: string;
}

export interface EvalReport {
  readonly cells: readonly CellReport[];
  readonly name: string;
}

/** The grid a definition expands to, before anything runs, so a caller can
 * count what a run will cost without starting it. */
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
