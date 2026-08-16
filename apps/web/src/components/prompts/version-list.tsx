import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import type { KeyboardEvent } from "react";
import { VersionRow } from "@/components/prompts/version-row";

interface VersionListProps {
  readonly onSelect: (version: ResolvedPrompt) => void;
  readonly versions: readonly ResolvedPrompt[];
  readonly viewedVersion: number;
}

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight"]);
const PREVIOUS_KEYS = new Set(["ArrowUp", "ArrowLeft"]);

export function VersionList({
  onSelect,
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
      className="flex flex-col divide-y divide-border-surface"
      onKeyDown={move}
      role="listbox"
    >
      {versions.map((version) => (
        <VersionRow
          key={version.versionId}
          onSelect={() => onSelect(version)}
          version={version}
          viewing={version.version === viewedVersion}
        />
      ))}
    </div>
  );
}
