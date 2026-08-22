import type { PlaygroundConfigView } from "@anpord/schema/domain/evals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import {
  createPlayground,
  runPlayground,
  savePlayground,
} from "@/lib/evals/evals-client";

/** Every write to a playground changes what its screen reports, so they all
 * invalidate the same root rather than each hook choosing for itself. */
type PlaygroundConfig = typeof PlaygroundConfigView.Type;

const usePlaygroundMutation = <TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.playgrounds() });
    },
  });
};

export const useCreatePlayground = () =>
  usePlaygroundMutation((name: string) => createPlayground(name));

export const useSavePlayground = () =>
  usePlaygroundMutation(
    (input: {
      readonly config: PlaygroundConfig;
      readonly id: string;
      readonly name: string;
    }) => savePlayground(input.id, { config: input.config, name: input.name })
  );

/** Starting a run adds one to the list a reader is about to look at, so the
 * run list is invalidated as well as the playground that produced it. */
export const useRunPlayground = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => runPlayground(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.playgrounds() });
      queryClient.invalidateQueries({ queryKey: evalKeys.lists() });
    },
  });
};
