import { SetChannelRequest } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Schema } from "effect";
import { setChannel } from "@/lib/prompts-client";
import { activityKeys } from "@/lib/query/activity-keys";
import { promptKeys } from "@/lib/query/prompt-keys";

interface SetChannelInput {
  channel: string;
  version: number;
}

/* Decoded rather than asserted, so an invalid channel fails here instead of at the API. */
const decodeRequest = Schema.decodeUnknownSync(SetChannelRequest);

export function useSetPromptChannel(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetChannelInput) =>
      setChannel(id, decodeRequest(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}
