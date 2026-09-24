import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createChannel,
  deleteChannel,
  updateChannel,
} from "@/lib/channels-client";
import { activityKeys } from "@/lib/query/activity-keys";
import { channelKeys } from "@/lib/query/channel-keys";
import { promptKeys } from "@/lib/query/prompt-keys";

const useChannelMutation = <TInput>(
  mutationFn: (input: TInput) => Promise<unknown>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.all });
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
};

export const useCreateChannel = () =>
  useChannelMutation((input: { color: string; name: string }) =>
    createChannel(input)
  );

export const useUpdateChannel = () =>
  useChannelMutation(
    (input: { color?: string; current: string; name?: string }) => {
      const { current, ...body } = input;
      return updateChannel(current, body);
    }
  );

export const useDeleteChannel = () =>
  useChannelMutation((name: string) => deleteChannel(name));
