import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useRouter } from "@tanstack/react-router";
import { signOut } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();

  return async function onSignOut() {
    const result = await signOut();
    handleMutationResult(result, {
      errorTitle: "Couldn't sign out",
      onSuccess: () => router.invalidate(),
    });
  };
}
