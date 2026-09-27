import { expect, test } from "bun:test";
import type { EvalCostComponent } from "@anpord/schema/domain/eval-costs";
import { renderToStaticMarkup } from "react-dom/server";
import { CostBreakdown } from "../../../src/components/evals/cost-breakdown";

const line = (
  component: EvalCostComponent["component"],
  usd: number
): EvalCostComponent => ({
  classification: "estimate",
  component,
  detail: {},
  explanation: "",
  source: "models.dev",
  usd,
});

test("shows the simulated user and the judges on lines of their own", () => {
  const markup = renderToStaticMarkup(
    <CostBreakdown
      costs={{
        allocatedUsd: 0,
        components: [
          line("model", 0.5),
          line("user", 0.02),
          line("judge", 0.03),
        ],
        estimatedEquivalentUsd: 0.55,
        incomplete: false,
        knownActualUsd: 0,
      }}
    />
  );
  const labels = [...markup.matchAll(/aria-label="([^"]+)"/g)].map(
    ([, label]) => label
  );

  expect(labels).toEqual(["model", "simulated user", "judges"]);
});
