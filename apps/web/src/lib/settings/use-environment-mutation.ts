import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { environmentKeys } from "@/lib/environment-queries";

export function useEnvironmentMutation<TInput, TResult>({
  failure,
  mutationFn,
}: {
  readonly failure: string;
  readonly mutationFn: (input: TInput) => Promise<TResult>;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onError: (error) => toast.error(failure, { description: error.message }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: environmentKeys.all }),
  });
}
