import type {
  EvalCaseVersion,
  EvalCellHistoryEntry,
} from "@anpord/schema/domain/evals";

export type TimelineItem =
  | { readonly entry: EvalCellHistoryEntry; readonly kind: "reading" }
  | {
      readonly created: boolean;
      readonly kind: "edit";
      readonly version: EvalCaseVersion;
    };

export const timelineOf = (
  entries: readonly EvalCellHistoryEntry[],
  versions: readonly EvalCaseVersion[]
): readonly TimelineItem[] => {
  const byHash = new Map(
    versions.map((version) => [version.definitionHash, version])
  );
  const first = versions[0]?.definitionHash;

  return entries.flatMap((entry, index): TimelineItem[] => {
    const older = entries[index + 1];
    const version = byHash.get(entry.definitionHash);
    const introduced =
      version !== undefined && older?.definitionHash !== entry.definitionHash;

    return introduced
      ? [
          { entry, kind: "reading" },
          {
            created: version.definitionHash === first,
            kind: "edit",
            version,
          },
        ]
      : [{ entry, kind: "reading" }];
  });
};
