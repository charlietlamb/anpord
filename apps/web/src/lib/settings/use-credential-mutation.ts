import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { credentialKeys } from "@/lib/credential-queries";

export function useCredentialMutation<TInput, TResult>({
  mutationFn,
  success,
}: {
  readonly mutationFn: (input: TInput) => Promise<TResult>;
  readonly success?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onError: (error) => toast.error(error.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: credentialKeys.connections() }),
    onSuccess: () => {
      if (success !== undefined) {
        toast.success(success);
      }
    },
  });
}
