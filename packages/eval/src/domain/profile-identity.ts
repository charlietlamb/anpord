import { createHash } from "node:crypto";
import type { ProfileContent } from "./harness-profile";

/* Compared by code unit rather than by locale, so the version a machine
   computes does not move with the machine's language. */
const byCodeUnit = (left: string, right: string) => (left < right ? -1 : 1);

const sortedEntries = (
  record: Readonly<Record<string, string>> | null | undefined
) =>
  record == null
    ? null
    : Object.entries(record).toSorted(([left], [right]) =>
        byCodeUnit(left, right)
      );

/**
 * The content hash a profile is versioned by.
 *
 * Every field takes part and the maps are sorted first, so two profiles that
 * differ only in the order their files were read share a version, and two
 * that differ in one byte of one file do not. The name is left out: it is in
 * the cell key, and renaming a profile is not editing it.
 */
export const profileVersionOf = (profile: ProfileContent): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        env: sortedEntries(profile.env),
        files: sortedEntries(profile.files),
        /* Coalesced so a field the wire omitted and a field explicitly null
           hash alike: the same profile must not get two versions for the way
           its absence was spelled. */
        install: profile.install ?? null,
        run: profile.run ?? null,
        systemPrompt: profile.systemPrompt ?? null,
      })
    )
    .digest("hex")
    .slice(0, 32);
