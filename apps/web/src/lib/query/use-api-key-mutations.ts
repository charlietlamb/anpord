import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { apiKeyKeys } from "@/lib/query/api-key-queries";

const useApiKeyMutation = <TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
  });
};

export const useCreateApiKey = () =>
  useApiKeyMutation(async (input: { name: string; organizationId: string }) => {
    const { data, error } = await authClient.apiKey.create(input);
    if (error) {
      throw new Error(error.message ?? "Couldn't create the key");
    }
    return data;
  });

export const useRevokeApiKey = () =>
  useApiKeyMutation(async (keyId: string) => {
    const { error } = await authClient.apiKey.delete({ keyId });
    if (error) {
      throw new Error(error.message ?? "Couldn't revoke the key");
    }
  });
