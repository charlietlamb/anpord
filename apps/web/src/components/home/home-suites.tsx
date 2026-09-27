import { HomeSuiteCard } from "@/components/home/home-suite-card";
import { HomeSuiteCompact } from "@/components/home/home-suite-compact";
import type { HomeView } from "@/lib/evals/home-view";

export function HomeSuites({ view }: { readonly view: HomeView }) {
  if (view.featured.length === 0) {
    return (
      <p className="rounded-xl border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
        No evals match this filter.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {view.featured.map((card) => (
          <HomeSuiteCard card={card} key={card.suite.id} />
        ))}
      </div>
      {view.compact.length === 0 ? null : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
          {view.compact.map((card) => (
            <HomeSuiteCompact card={card} key={card.suite.id} />
          ))}
        </div>
      )}
    </>
  );
}
