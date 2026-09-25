import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CaseFilterMenu } from "@/components/evals/case-filter-menu";
import { CasesTable } from "@/components/evals/cases-table";
import { CursorPagination } from "@/components/layout/cursor-pagination";
import { SearchInput } from "@/components/layout/search-input";
import { SortMenu } from "@/components/layout/sort-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PLACEHOLDER_CASE_PAGE } from "@/lib/evals/eval-placeholders";
import { CASE_SORT_OPTIONS } from "@/lib/query/case-list-filters";

export const Route = createFileRoute("/dev/filters")({
  component: FiltersPreview,
  ssr: false,
});

const SUITES = [
  { id: "a-trial-that-dies", name: "a trial that dies" },
  { id: "asks-before-it-pushes", name: "asks before it pushes" },
  { id: "autumn-push-approval", name: "autumn-push-approval" },
  { id: "basics-pro-growth-clear", name: "basics-pro-growth-clear" },
  { id: "basics-pro-growth-late-fact", name: "basics-pro-growth-late-fact" },
  { id: "imported", name: "imported" },
  { id: "local-checks", name: "local checks" },
  { id: "push-preview-approval", name: "push-preview-approval" },
  { id: "stream-probe", name: "stream-probe" },
];

const TAGS = ["billing", "conversation", "slow"];

const NOTHING = () => undefined;

function FiltersPreview() {
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [suite, setSuite] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Filters</h1>
            <p className="text-muted-foreground text-sm">
              The cases toolbar with live state. Open the filter menu and step
              into a submenu to check the popover against the table beneath it.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <SortMenu
            direction={order}
            onChange={setSort}
            onDirection={setOrder}
            options={CASE_SORT_OPTIONS}
            value={sort}
          />
          <CaseFilterMenu
            onClear={() => {
              setSuite(null);
              setTag(null);
            }}
            onSuite={setSuite}
            onTag={setTag}
            suite={suite}
            suites={SUITES}
            tag={tag}
            tags={TAGS}
          />
          <SearchInput
            grow
            label="Search cases"
            onChange={setQuery}
            value={query}
          />
          <Button size="sm">
            <PlusIcon />
            New eval
          </Button>
        </div>

        <CasesTable
          cases={PLACEHOLDER_CASE_PAGE.cases}
          pagination={
            <CursorPagination
              canGoNext
              canGoPrev={false}
              disabled={false}
              onNext={NOTHING}
              onPrev={NOTHING}
              page={1}
            />
          }
        />
      </div>
    </main>
  );
}
