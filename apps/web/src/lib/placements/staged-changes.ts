import type { PromptPlacements } from "@anpord/schema/domain/placements";

/**
 * One pending move, holding both ends.
 *
 * `from` travels with the change because every question worth asking about a
 * staged move needs it: whether it goes backwards, what it says in the review,
 * and what to point back at if the batch is undone.
 */
export interface StagedChange {
  readonly channel: string;
  readonly from: number | null;
  readonly promptId: string;
  readonly promptName: string;
  readonly to: number;
}

export type StagedMap = ReadonlyMap<string, StagedChange>;

export const stagedKey = (promptId: string, channel: string) =>
  `${promptId}:${channel}`;

/** A move to a lower version is a rollback. Named rather than inferred at each
 * call site, since it is what decides the colour, the count and the gate. */
export const isRollback = (change: StagedChange) =>
  change.from !== null && change.to < change.from;

export const rollbackCount = (staged: StagedMap) =>
  [...staged.values()].filter(isRollback).length;

/** Staging a move that restores the current version is not a change, so it
 * clears any pending one instead of recording a no-op. */
export const stage = (staged: StagedMap, change: StagedChange): StagedMap => {
  const next = new Map(staged);
  const key = stagedKey(change.promptId, change.channel);

  if (change.from === change.to) {
    next.delete(key);
  } else {
    next.set(key, change);
  }

  return next;
};

export const unstage = (
  staged: StagedMap,
  promptId: string,
  channel: string
): StagedMap => {
  const next = new Map(staged);
  next.delete(stagedKey(promptId, channel));
  return next;
};

/**
 * Every channel this prompt already serves, moved to its newest version.
 *
 * Channels the prompt has never been pointed at are left alone: not being set
 * is a decision nobody has made yet, and catching up should never start
 * serving a channel that served nothing.
 */
export const stageRowToLatest = (
  staged: StagedMap,
  prompt: PromptPlacements
): StagedMap => {
  if (prompt.latestVersion === null) {
    return staged;
  }

  let next = staged;
  for (const placement of prompt.placements) {
    next = stage(next, {
      channel: placement.channel,
      from: placement.version,
      promptId: prompt.id,
      promptName: prompt.name,
      to: prompt.latestVersion,
    });
  }

  return next;
};

/** Ordered so the review reads the way it should be read: what moves backwards
 * first, then everything else by prompt. */
export const orderedChanges = (staged: StagedMap): readonly StagedChange[] =>
  [...staged.values()].sort((left, right) => {
    if (isRollback(left) !== isRollback(right)) {
      return isRollback(left) ? -1 : 1;
    }
    return (
      left.promptName.localeCompare(right.promptName) ||
      left.channel.localeCompare(right.channel)
    );
  });
