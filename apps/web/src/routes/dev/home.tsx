import type { EvalHome } from "@sphynx/schema/domain/eval-home";
import { PageTabs } from "@sphynx/ui/components/ui/page-tabs";
import { createFileRoute } from "@tanstack/react-router";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  HOME,
  HOME_ALL_GREEN,
  HOME_EMPTY,
  HOME_MANY_SUITES,
} from "@/components/dev/home-fixtures";
import { HomeScreen } from "@/components/home/home-screen";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useHomeFilters } from "@/lib/evals/use-home-filters";

export const Route = createFileRoute("/dev/home")({
  component: HomePreview,
  ssr: false,
});

const STATES: Record<
  string,
  { readonly error: Error | null; readonly home: EvalHome | undefined }
> = {
  default: { error: null, home: HOME },
  green: { error: null, home: HOME_ALL_GREEN },
  empty: { error: null, home: HOME_EMPTY },
  loading: { error: null, home: undefined },
  error: {
    error: new Error("The server did not answer. Try again in a moment."),
    home: undefined,
  },
  many: { error: null, home: HOME_MANY_SUITES },
};

const OPTIONS = [
  { label: "Default", value: "default" },
  { label: "All green", value: "green" },
  { label: "Empty", value: "empty" },
  { label: "Loading", value: "loading" },
  { label: "Error", value: "error" },
  { label: "Many suites", value: "many" },
] as const;

const stateParser = parseAsStringLiteral(
  OPTIONS.map((option) => option.value)
).withDefault("default");

function HomePreview() {
  const [state, setState] = useQueryState("state", stateParser);
  const [filters, setFilters] = useHomeFilters();
  const { error, home } = STATES[state];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 pt-4 xl:px-6">
        <PageTabs onChange={setState} options={OPTIONS} value={state} />
        <ThemeToggle />
      </div>
      <HomeScreen
        error={error}
        filters={filters}
        home={home}
        onFilters={setFilters}
      />
    </div>
  );
}
