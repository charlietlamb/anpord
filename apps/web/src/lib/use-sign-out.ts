import { handleMutationResult } from "@anpord/ui/lib/mutation-result";
import { useRouter } from "@tanstack/react-router";
import { signOut } from "@/lib/auth-client";

/**
 * Signing out, and what happens next.
 *
 * Where a reader lands afterwards depends on where they were: a page inside
 * the app re-reads its session and shows the signed-out state, while the
 * marketing header sends them to sign in again. The failure is the same either
 * way, and that was the half written twice -- one copy having already drifted
 * to a different message and an extra toast.
 */
export function useSignOut(onSignedOut?: () => void) {
  const router = useRouter();

  return async function onSignOut() {
    const result = await signOut();

    handleMutationResult(result, {
      errorTitle: "Couldn't sign out",
      onSuccess: onSignedOut ?? (() => router.invalidate()),
    });
  };
}
