import { EvalHomeRange } from "@anpord/schema/domain/eval-home";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";
import { HomeScreen } from "@/components/home/home-screen";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useHomeFilters } from "@/lib/evals/use-home-filters";

export const Route = createFileRoute("/_authed/")({
  ssr: false,
  loader: ({ context, location }) => {
    if (context.authenticated) {
      const { range } = location.search as { readonly range?: unknown };
      context.queryClient.prefetchQuery(
        evalQueries.home(Schema.is(EvalHomeRange)(range) ? range : "7d")
      );
    }
  },
  component: Home,
  staticData: { title: "Home" },
});

function Home() {
  const [filters, setFilters] = useHomeFilters();
  const { data, error } = useQuery(evalQueries.home(filters.range));

  return (
    <HomeScreen
      error={error}
      filters={filters}
      home={data}
      onFilters={setFilters}
    />
  );
}
