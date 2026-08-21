import type { Channel } from "@anpord/schema/domain/channels";
import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import type { KeyboardEvent } from "react";
import { VersionRow } from "@/components/prompts/version-row";

interface VersionListProps {
  readonly channels: readonly Channel[];
  readonly onEditFrom: (version: ResolvedPrompt) => void;
  readonly onPromote: (channel: string, version: number) => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  /** Where each channel points, so a row can say what it serves. */
  readonly placements: readonly ChannelPlacement[];
  readonly versions: readonly ResolvedPrompt[];
  readonly viewedVersion: number;
}

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft"]);

/** The channels a version serves, which is what makes its row say it is live
 * rather than merely saved. */
const servedBy = (
  placements: readonly ChannelPlacement[],
  version: number
): readonly string[] =>
  placements.reduce<string[]>((names, placement) => {
    if (placement.version === version) {
      names.push(placement.channel);
    }
    return names;
  }, []);

export function VersionList({
  channels,
  onEditFrom,
  onPromote,
  onSelect,
  placements,
  versions,
  viewedVersion,
}: VersionListProps) {
  const index = versions.findIndex(
    (version) => version.version === viewedVersion
  );

  const destination = (key: string) => {
    if (NEXT_KEYS.has(key)) {
      return index + 1;
    }
    if (PREVIOUS_KEYS.has(key)) {
      return index - 1;
    }
    if (key === "Home") {
      return 0;
    }
    return key === "End" ? versions.length - 1 : null;
  };

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = destination(event.key);
    if (next === null) {
      return;
    }

    event.preventDefault();
    const target = versions.at(
      Math.min(Math.max(next, 0), versions.length - 1)
    );
    if (target) {
      onSelect(target);
    }
  };

  return (
    <div
      aria-label="Versions"
      className="flex flex-col"
      onKeyDown={move}
      role="listbox"
    >
      {versions.map((version) => (
        <VersionRow
          channels={channels}
          key={version.versionId}
          onEditFrom={() => onEditFrom(version)}
          onPromote={(channel) => onPromote(channel, version.version)}
          onSelect={() => onSelect(version)}
          servedBy={servedBy(placements, version.version)}
          version={version}
          viewing={version.version === viewedVersion}
        />
      ))}
    </div>
  );
}
