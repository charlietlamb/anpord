import { queryOptions } from "@tanstack/react-query";
import { getSession } from "@/lib/get-session";

const SESSION_CHECK_MS = 60_000;

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: () => getSession(),
  staleTime: SESSION_CHECK_MS,
});
