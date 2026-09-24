import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { credentialKeys } from "@/lib/credential-queries";
import { credentialsClient } from "@/lib/credentials-client";
import { useCredentialMutation } from "@/lib/settings/use-credential-mutation";

const POLL_MS = 2000;

export function useDeviceLogin(onConnected: () => void) {
  const queryClient = useQueryClient();
  const start = useCredentialMutation({
    mutationFn: credentialsClient.startDevice,
  });
  const challenge = start.data ?? null;
  const attemptId = challenge?.attemptId ?? "";

  useQuery({
    enabled: challenge !== null,
    gcTime: 0,
    queryFn: async () => {
      const result = await credentialsClient.deviceStatus(attemptId);

      if (result.status === "complete") {
        toast.success("ChatGPT connected");
        queryClient.invalidateQueries({
          queryKey: credentialKeys.connections(),
        });
        onConnected();
      }

      if (result.status === "failed" || result.status === "expired") {
        toast.error(`ChatGPT login ${result.status}`);
        start.reset();
      }

      return result;
    },
    queryKey: credentialKeys.device(attemptId),
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
