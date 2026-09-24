import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@anpord/ui/components/ui/command";
import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import { useQuery } from "@tanstack/react-query";
import { staffQueries } from "@/lib/query/staff-queries";

interface ImpersonatePageProps {
  readonly onSelect: (userId: string) => void;
  readonly search: string;
}

const PLACEHOLDER_PEOPLE = [0, 1, 2].map((row) => ({
  email: `placeholder${row}@example.com`,
  id: `placeholder-${row}`,
  name: "Placeholder name",
}));

export function ImpersonatePage({ onSelect, search }: ImpersonatePageProps) {
  const { data, isFetching } = useQuery(staffQueries.users(search, true));

  if (search.length === 0) {
    return (
      <CommandEmpty>Search for someone by name or email address.</CommandEmpty>
    );
  }

  const loading = isFetching && !data;
  const people = loading ? PLACEHOLDER_PEOPLE : (data ?? []);

  if (people.length === 0) {
    return <CommandEmpty>Nobody matches “{search}”.</CommandEmpty>;
  }

  return (
    <SkeletonScope loading={loading}>
      <CommandGroup heading="Impersonate">
        {people.map((person) => (
          <CommandItem
            key={person.id}
            onSelect={() => onSelect(person.id)}
            value={person.id}
          >
            <span className="truncate">{person.name || person.email}</span>
            {person.name ? (
              <span className="ml-auto truncate text-muted-foreground">
                {person.email}
              </span>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>
    </SkeletonScope>
  );
}
