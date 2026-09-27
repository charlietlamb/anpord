import type { EvalHomeVerdict } from "@anpord/schema/domain/eval-home";
import { HomeOverview } from "@/components/home/home-overview";
import { HomeReasons } from "@/components/home/home-reasons";
import { HomeRecentRuns } from "@/components/home/home-recent-runs";
import { HomeSuites } from "@/components/home/home-suites";
import { HomeTrendChart } from "@/components/home/home-trend-chart";
import { HomeVariantGrid } from "@/components/home/home-variant-grid";
import type { HomeFilters, HomeView } from "@/lib/evals/home-view";

export function HomeDashboard({
  filters,
  onReason,
  onVerdict,
  spendUsd,
  view,
}: {
  readonly filters: HomeFilters;
  readonly onReason: (reason: string | null) => void;
  readonly onVerdict: (verdict: EvalHomeVerdict | null) => void;
  readonly spendUsd: number;
  readonly view: HomeView;
}) {
  return (
    <div className="flex flex-col gap-5">
      <HomeOverview
        onVerdict={onVerdict}
        range={filters.range}
        spendUsd={spendUsd}
        verdict={filters.verdict}
        view={view}
      />
      <HomeSuites view={view} />
      <div className="grid gap-4 lg:grid-cols-2">
        <HomeReasons
          onReason={onReason}
          reason={filters.reason}
          reasons={view.reasons}
        />
        <HomeTrendChart trend={view.trend} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <HomeVariantGrid grid={view.grid} />
        <HomeRecentRuns runs={view.runs} />
      </div>
    </div>
  );
}
