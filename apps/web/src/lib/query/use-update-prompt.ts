import { UpdatePromptRequest } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Schema } from "effect";
import { updatePrompt } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

interface UpdatePromptInput {
  id?: string;
  name?: string;
}

const decodeRequest = Schema.decodeUnknownSync(UpdatePromptRequest);

export function useUpdatePrompt(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePromptInput) =>
      updatePrompt(id, decodeRequest(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
