import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/home/home-screen";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useHomeFilters } from "@/lib/evals/use-home-filters";

export const Route = createFileRoute("/_authed/")({
  ssr: false,
  loader: ({ context }) => {
    if (context.authenticated) {
      context.queryClient.prefetchQuery(evalQueries.home("7d"));
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
