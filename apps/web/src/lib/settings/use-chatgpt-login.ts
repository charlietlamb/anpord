import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { environmentClient } from "@/lib/environment-client";
import { environmentKeys } from "@/lib/environment-queries";
import { useEnvironmentMutation } from "@/lib/settings/use-environment-mutation";

const POLL_MS = 2000;

export function useChatGptLogin(onConnected: () => void) {
  const queryClient = useQueryClient();
  const start = useEnvironmentMutation({
    failure: "Couldn't start the ChatGPT sign in",
    mutationFn: environmentClient.startChatGpt,
  });
  const challenge = start.data ?? null;
  const attemptId = challenge?.attemptId ?? "";

  useQuery({
    enabled: challenge !== null,
    gcTime: 0,
    queryFn: async () => {
      const result = await environmentClient.chatGptStatus(attemptId);

      if (result.status === "complete") {
        queryClient.invalidateQueries({
          queryKey: environmentKeys.subscriptions(),
        });
        onConnected();
      }

      if (result.status === "failed" || result.status === "expired") {
        toast.error(
          result.status === "expired"
            ? "The ChatGPT code expired. Try again."
            : "ChatGPT sign in didn't finish. Try again."
        );
        start.reset();
      }

      return result;
    },
    queryKey: environmentKeys.chatGpt(attemptId),
    refetchInterval: (query) =>
      (query.state.data?.status ?? "pending") === "pending" ? POLL_MS : false,
  });

  return {
    challenge,
    reset: start.reset,
    start: start.mutate,
    starting: start.isPending,
  };
}
