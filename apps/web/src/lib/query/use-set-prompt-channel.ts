import { SetChannelRequest } from "@anpord/schema/domain/prompts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Schema } from "effect";
import { setChannel } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

interface SetChannelInput {
  channel: string;
  version: number;
}

/**
 * The rail hands over a plain channel name and version, so the branded request
 * is decoded here rather than asserted; an invalid channel fails as a rejected
 * mutation instead of reaching the API as a bad body.
 */
const decodeRequest = Schema.decodeUnknownSync(SetChannelRequest);

export function useSetPromptChannel(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetChannelInput) =>
      setChannel(id, decodeRequest(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
    },
  });
}
