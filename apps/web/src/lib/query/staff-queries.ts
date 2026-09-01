import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const RESULT_LIMIT = 20;
const MINUTE = 60 * 1000;

export interface StaffUser {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

const staffKeys = {
  all: ["staff"] as const,
  users: (search: string) => [...staffKeys.all, "users", search] as const,
} as const;

const searchField = (
  search: string,
  field: "email" | "name"
): Promise<readonly StaffUser[]> =>
  authClient.admin
    .listUsers({
      query: {
        limit: RESULT_LIMIT,
        searchField: field,
        searchOperator: "contains",
        searchValue: search,
      },
    })
    .then((result) =>
      result.error || !result.data
        ? []
        : (result.data.users as readonly StaffUser[])
    );

/**
 * Everyone matching a search, by name or email.
 *
 * Better Auth searches one field per request, and a staff member looking
 * someone up does not know which of the two they are typing. Both run and the
 * results merge, so "ada" finds Ada Lovelace and ada@example.com alike.
 */
async function findUsers(search: string): Promise<readonly StaffUser[]> {
  const [byName, byEmail] = await Promise.all([
    searchField(search, "name"),
    searchField(search, "email"),
  ]);

  const found = new Map<string, StaffUser>();
  for (const person of [...byName, ...byEmail]) {
    found.set(person.id, person);
  }

  return [...found.values()].slice(0, RESULT_LIMIT);
}

export const staffQueries = {
  users: (search: string, enabled: boolean) =>
    queryOptions({
      enabled: enabled && search.length > 0,
      queryFn: () => findUsers(search),
      queryKey: staffKeys.users(search),
      staleTime: MINUTE,
    }),
} as const;
