import type { UpdatePromptRequest } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePrompt } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

interface UpdatePromptInput {
  id?: string;
  name?: string;
}

export function useUpdatePrompt(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePromptInput) =>
      updatePrompt(id, input as UpdatePromptRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
