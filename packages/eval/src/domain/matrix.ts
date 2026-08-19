import {
  type CellKey,
  cellKeyOf,
  type HarnessName,
  type ProviderName,
} from "./cell";
import type { Distribution } from "./distribution";

export interface Axes {
  readonly harnesses: readonly HarnessName[];
  readonly models: readonly string[];
  readonly providers: readonly ProviderName[];
}

export interface PlannedCell {
  readonly cellKey: CellKey;
  readonly harness: HarnessName;
  readonly harnessVersion: string;
  readonly model: string;
  readonly provider: ProviderName;
}

export interface MatrixPlan {
  readonly cells: readonly PlannedCell[];
  readonly trialCount: number;
}

/** Expanding axes into cells is a calculation, not a service: same inputs,
 * same cells, no I/O to reach for. */
export const planMatrix = (input: {
  readonly axes: Axes;
  readonly harnessVersions: Readonly<Record<string, string>>;
  readonly taskId: string;
  readonly taskVersion: string;
  readonly trials: number;
}): MatrixPlan => {
  const cells = input.axes.harnesses.flatMap((harness) =>
    input.axes.models.flatMap((model) =>
      input.axes.providers.map((provider) => {
        const harnessVersion = input.harnessVersions[harness] ?? "unknown";

        return {
          cellKey: cellKeyOf({
            harness,
            harnessVersion,
            model,
            provider,
            taskId: input.taskId,
            taskVersion: input.taskVersion,
          }),
          harness,
          harnessVersion,
          model,
          provider,
        } satisfies PlannedCell;
      })
    )
  );

  return { cells, trialCount: cells.length * input.trials };
};

export interface CellResult {
  readonly cell: PlannedCell;
  readonly distribution: Distribution;
}

export type AxisName = "harness" | "model" | "provider";

export interface AxisVerdict {
  readonly axis: AxisName;
  readonly separated: boolean;
  readonly spread: number;
  readonly values: readonly string[];
}

const valueOn = (cell: PlannedCell, axis: AxisName) => {
  if (axis === "harness") {
    return cell.harness;
  }

  return axis === "model" ? cell.model : cell.provider;
};

/**
 * Whether an axis made a measurable difference.
 *
 * Reporting that an axis did *not* separate is a finding in its own right: it
 * tells a customer to stop paying for a dimension. Suppressing it would let
 * them believe a choice was validated when it was merely unexamined.
 *
 * The threshold is deliberately coarse. At ten trials a difference of one
 * passing run is noise, and calling that a separation would manufacture
 * exactly the false precision the product exists to avoid.
 */
const SEPARATION_THRESHOLD = 0.2;

export const axisVerdict = (
  results: readonly CellResult[],
  axis: AxisName
): AxisVerdict => {
  const byValue = new Map<string, number[]>();

  for (const result of results) {
    const value = valueOn(result.cell, axis);
    const rates = byValue.get(value) ?? [];
    rates.push(result.distribution.passRate);
    byValue.set(value, rates);
  }

  const means = [...byValue.values()].map(
    (rates) => rates.reduce((total, rate) => total + rate, 0) / rates.length
  );

  const spread = means.length < 2 ? 0 : Math.max(...means) - Math.min(...means);

  return {
    axis,
    separated: spread >= SEPARATION_THRESHOLD,
    spread,
    values: [...byValue.keys()],
  };
};
