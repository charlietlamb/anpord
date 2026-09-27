import type { EvalHome } from "@anpord/schema/domain/eval-home";
import { Button } from "@anpord/ui/components/button";
import { HouseIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { HomeToolbar } from "@/components/home/home-toolbar";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { PLACEHOLDER_HOME } from "@/lib/evals/eval-placeholders";
import { type HomeFilters, homeView } from "@/lib/evals/home-view";

export function HomeScreen({
  error,
  filters,
  home,
  onFilters,
}: {
  readonly error: Error | null;
  readonly filters: HomeFilters;
  readonly home: EvalHome | undefined;
  readonly onFilters: (changed: Partial<HomeFilters>) => void;
}) {
  const shown = home ?? PLACEHOLDER_HOME;
  const view = homeView(shown, { ...filters, range: shown.range });

  return (
    <PageShell
      actions={
        <HomeToolbar
          onRange={(range) => onFilters({ range })}
          onSuite={(suite) => onFilters({ suite })}
          onVariant={(variant) => onFilters({ variant })}
          range={filters.range}
          suite={filters.suite}
          suites={home === undefined ? [] : view.options.suites}
          variant={filters.variant}
          variants={home === undefined ? [] : view.options.variants}
        />
      }
      title="Home"
      width="wide"
    >
      <ListState
        action={
          <Button nativeButton={false} render={<Link to="/evals/new" />}>
            <PlusIcon />
            New eval
          </Button>
        }
        description="Run your first eval and how it does shows up here."
        empty={shown.evals.length === 0}
        error={home === undefined ? error : null}
        icon={<HouseIcon />}
        loading={home === undefined && error === null}
        title="No evals yet"
      >
        <HomeDashboard
          filters={filters}
          onReason={(reason) => onFilters({ reason, verdict: null })}
          onVerdict={(verdict) => onFilters({ reason: null, verdict })}
          spendUsd={shown.spendUsd}
          view={view}
        />
      </ListState>
    </PageShell>
  );
}
