import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addVersion } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

interface AddVersionInput {
  commitMessage?: string;
  content: string;
  publish?: boolean;
}

export function useAddPromptVersion(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddVersionInput) => addVersion(id, input),
    onSuccess: (created) => {
      /**
       * The response is the new version in full, so the history is extended
       * from it directly; refetching would only re-fetch what we already hold.
       */
      queryClient.setQueryData(
        promptKeys.versions(id),
        (previous: readonly ResolvedPrompt[] | undefined) => [
          created,
          ...(previous ?? []),
        ]
      );
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
