import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVersion } from "@/lib/prompts-client";
import { activityKeys } from "@/lib/query/activity-keys";
import { promptKeys } from "@/lib/query/prompt-keys";

interface UpdateVersionInput {
  commitMessage?: string;
  content: string;
  version: number;
}

export function useUpdatePromptVersion(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ version, ...body }: UpdateVersionInput) =>
      updateVersion(id, version, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        promptKeys.versions(id),
        (previous: readonly ResolvedPrompt[] | undefined) =>
          previous?.map((row) =>
            row.version === updated.version ? updated : row
          )
      );
      queryClient.invalidateQueries({ queryKey: promptKeys.channels(id) });
      /** The overwrite is recorded server-side, so the activity below the
       * prompt is stale until it is read again. */
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
