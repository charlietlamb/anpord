import { HomePanel } from "@/components/home/home-panel";
import { VerdictSquares } from "@/components/home/verdict-squares";
import type { HomeSuiteCard } from "@/lib/evals/home-view";

export function HomeSuiteCompact({ card }: { readonly card: HomeSuiteCard }) {
  return (
    <HomePanel className="flex-row items-center gap-4" title={card.suite.name}>
      <span className="shrink-0 font-semibold text-lg tabular-nums tracking-tight">
        {card.tally.passRate === null ? "None" : `${card.tally.passRate}%`}
      </span>
      <VerdictSquares cells={card.cells} small />
    </HomePanel>
  );
}
