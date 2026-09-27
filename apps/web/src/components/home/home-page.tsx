import { useQuery } from "@tanstack/react-query";
import { HomeScreen } from "@/components/home/home-screen";
import { evalQueries } from "@/lib/evals/eval-queries";
import { useHomeFilters } from "@/lib/evals/use-home-filters";

export function HomePage() {
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
