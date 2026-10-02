import { Button } from "@sphynx/ui/components/button";
import { Link } from "@tanstack/react-router";
import { HomePanel } from "@/components/home/home-panel";
import { HomeSuiteRow } from "@/components/home/home-suite-row";
import type { HomeView } from "@/lib/evals/home-view";

export function HomeSuites({ view }: { readonly view: HomeView }) {
  return (
    <section aria-label="Suites" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-[15px]">Suites</h2>
        <Button
          nativeButton={false}
          render={<Link to="/evals/suites" />}
          size="sm"
          variant="outline"
        >
          {view.moreSuites === 0
            ? "View all suites"
            : `View all ${view.suites.length + view.moreSuites} suites`}
        </Button>
      </div>
      {view.suites.length === 0 ? (
        <p className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
          No evals match this filter.
        </p>
      ) : (
        <HomePanel className="px-4 py-1" title="Suites" titled={false}>
          <table className="w-full table-fixed text-[13px]">
            <thead>
              <tr className="h-8 text-left text-muted-foreground/70 text-xs">
                <th className="font-normal" scope="col">
                  Suite
                </th>
                <th className="w-[38%] font-normal" scope="col">
                  Evals
                </th>
                <th className="w-20 font-normal" scope="col">
                  Pass rate
                </th>
                <th className="w-20 font-normal" scope="col">
                  Failing
                </th>
                <th className="w-20 font-normal" scope="col">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {view.suites.map((row) => (
                <HomeSuiteRow key={row.suite.id} row={row} />
              ))}
            </tbody>
          </table>
        </HomePanel>
      )}
    </section>
  );
}
