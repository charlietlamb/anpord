import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { useCallback, useState } from "react";
import {
  type StagedChange,
  type StagedMap,
  stage,
  stagedKey,
  stageRowToLatest,
  unstage,
} from "@/lib/placements/staged-changes";

const EMPTY: StagedMap = new Map();

/**
 * The pending edits to the grid.
 *
 * Held here rather than in the query cache: these are the reader's intent, not
 * the server's answer, and a refetch that overwrote them would discard work
 * nobody asked to discard.
 */
export function useStagedPlacements() {
  const [staged, setStaged] = useState<StagedMap>(EMPTY);

  const stageOne = useCallback((change: StagedChange) => {
    setStaged((current) => stage(current, change));
  }, []);

  const unstageOne = useCallback((promptId: string, channel: string) => {
    setStaged((current) => unstage(current, promptId, channel));
  }, []);

  const stageLatest = useCallback((prompt: PromptPlacements) => {
    setStaged((current) => stageRowToLatest(current, prompt));
  }, []);

  const discard = useCallback(() => {
    setStaged(EMPTY);
  }, []);

  const changeFor = useCallback(
    (promptId: string, channel: string) =>
      staged.get(stagedKey(promptId, channel)),
    [staged]
  );

  return {
    changeFor,
    discard,
    stageLatest,
    stageOne,
    staged,
    unstageOne,
  };
}
