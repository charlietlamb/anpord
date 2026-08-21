import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addVersion } from "@/lib/prompts-client";
import { activityKeys } from "@/lib/query/activity-keys";
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
      queryClient.setQueryData(
        promptKeys.versions(id),
        (previous: readonly ResolvedPrompt[] | undefined) => [
          created,
          ...(previous ?? []),
        ]
      );
      queryClient.invalidateQueries({ queryKey: promptKeys.channels(id) });
      /** The save is recorded server-side, so the activity below the prompt is
       * stale until it is read again. */
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
