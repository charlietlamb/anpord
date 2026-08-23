import type { PlaygroundConfigView } from "@anpord/schema/domain/evals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evalKeys } from "@/lib/evals/eval-keys";
import {
  createPlayground,
  rerunCell,
  runPlayground,
  savePlayground,
} from "@/lib/evals/evals-client";

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

export const useRerunCell = (cellKey: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { readonly runId: string; readonly trials: number }) =>
      rerunCell(input.runId, cellKey, input.trials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: evalKeys.history(cellKey) });
    },
  });
};
