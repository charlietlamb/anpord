import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVersion } from "@/lib/prompts-client";
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
      /** A channel may serve the edited version, so what callers receive can
       * have changed without the placement itself moving. */
      queryClient.invalidateQueries({ queryKey: promptKeys.channels(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}
