import { Skeleton } from "@anpord/ui/components/skeleton";
import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@anpord/ui/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { staffQueries } from "@/lib/query/staff-queries";

interface ImpersonatePageProps {
  readonly onSelect: (userId: string) => void;
  readonly search: string;
}

const PLACEHOLDER_ROWS = [0, 1, 2];

export function ImpersonatePage({ onSelect, search }: ImpersonatePageProps) {
  const { data, isFetching } = useQuery(staffQueries.users(search, true));

  if (search.length === 0) {
    return (
      <CommandEmpty>Search for someone by name or email address.</CommandEmpty>
    );
  }

  if (isFetching && !data) {
    return (
      <div className="flex flex-col gap-2 p-2">
        {PLACEHOLDER_ROWS.map((row) => (
          <Skeleton className="h-7 w-full" key={row} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <CommandEmpty>Nobody matches “{search}”.</CommandEmpty>;
  }

  return (
    <CommandGroup heading="Impersonate">
      {data.map((person) => (
        <CommandItem
          key={person.id}
          onSelect={() => onSelect(person.id)}
          /* Keyed by id so cmdk's own matching cannot re-filter results the
             server already chose, which would hide a match found by email
             while the reader was typing a name. */
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
  );
}
