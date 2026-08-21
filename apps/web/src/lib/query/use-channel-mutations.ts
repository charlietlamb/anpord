import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createChannel,
  deleteChannel,
  updateChannel,
} from "@/lib/channels-client";
import { activityKeys } from "@/lib/query/activity-keys";
import { channelKeys } from "@/lib/query/channel-keys";
import { promptKeys } from "@/lib/query/prompt-keys";

/** A channel's name and colour appear on every prompt that publishes to it, so
 * changing one invalidates the prompt views as well as the channel list. */
const useChannelMutation = <TInput>(
  mutationFn: (input: TInput) => Promise<unknown>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
      /** Channel names are written into each activity row, so renaming one
       * leaves the history naming a channel that no longer exists. */
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
};

export const useCreateChannel = () =>
  useChannelMutation((input: { color: string; name: string }) =>
    createChannel(input)
  );

/** `current` addresses the channel; `name` is what it becomes, so a rename is
 * the same call as a recolour. */
export const useUpdateChannel = () =>
  useChannelMutation(
    (input: { color?: string; current: string; name?: string }) => {
      const { current, ...body } = input;
      return updateChannel(current, body);
    }
  );

export const useDeleteChannel = () =>
  useChannelMutation((name: string) => deleteChannel(name));
