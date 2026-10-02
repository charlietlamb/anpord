import { handleMutationResult } from "@sphynx/ui/lib/mutation-result";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { signOut } from "@/lib/auth-client";
import { sessionQuery } from "@/lib/session-query";

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return async function onSignOut() {
    const result = await signOut();

    handleMutationResult(result, {
      errorTitle: "Couldn't sign out",
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
        router.invalidate();
      },
    });
  };
}
