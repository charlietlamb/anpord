import type { ResolvedPrompt } from "@anpord/schema/prompts";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useIsClient } from "@/lib/use-is-client";

const VISIBLE_BY_DEFAULT = 5;

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const ABSOLUTE = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Recent edits read better as elapsed time; older ones as a date. */
function when(value: Date, now: number) {
  const at = value instanceof Date ? value : new Date(value);
  const elapsed = now - at.getTime();

  if (elapsed < HOUR) {
    return RELATIVE.format(
      -Math.max(1, Math.floor(elapsed / MINUTE)),
      "minute"
    );
  }
  if (elapsed < DAY) {
    return RELATIVE.format(-Math.floor(elapsed / HOUR), "hour");
  }
  if (elapsed < WEEK) {
    return RELATIVE.format(-Math.floor(elapsed / DAY), "day");
  }
  return ABSOLUTE.format(at);
}

interface VersionHistoryProps {
  readonly liveVersion: number | null;
  readonly onRestore: (version: ResolvedPrompt) => void;
  readonly onSelect: (version: ResolvedPrompt) => void;
  readonly selectedVersion: number | null;
  readonly versions: readonly ResolvedPrompt[];
}

export function VersionHistory({
  liveVersion,
  onRestore,
  onSelect,
  selectedVersion,
  versions,
}: VersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  /** Locale formatting differs between server and client, so defer to mount. */
  const isClient = useIsClient();
  const now = Date.now();

  if (versions.length === 0) {
    return null;
  }

  const shown = expanded ? versions : versions.slice(0, VISIBLE_BY_DEFAULT);
  const hidden = versions.length - shown.length;

  return (
    <section className="mt-4 rounded-xl p-1 shadow-[inset_0_0_0_1px_oklch(0_0_0/5%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%)]">
      <h2 className="px-3 pt-2 pb-1 font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-wider">
        Versions
      </h2>

      <ul>
        {shown.map((version) => {
          const live = version.version === liveVersion;
          const selected = version.version === selectedVersion;

          return (
            <li key={version.versionId}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  selected ? "bg-muted" : "hover:bg-muted/60"
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                  onClick={() => onSelect(version)}
                  type="button"
                >
                  <span className="w-6 shrink-0 font-medium text-muted-foreground text-xs tabular-nums">
                    v{version.version}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      version.commitMessage ? "" : "text-muted-foreground/70"
                    )}
                  >
                    {version.commitMessage ?? "No message"}
                  </span>
                </button>

                {live ? (
                  <span className="shrink-0 rounded bg-primary/12 px-1.5 py-0.5 font-semibold text-[0.625rem] text-primary uppercase tracking-wide">
                    Live
                  </span>
                ) : null}

                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {isClient ? when(version.createdAt, now) : null}
                </span>

                {live ? null : (
                  <button
                    aria-label={`Restore v${version.version}`}
                    className="-mr-1 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => onRestore(version)}
                    type="button"
                  >
                    <ArrowCounterClockwiseIcon size={14} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        <button
          className="w-full rounded-lg px-3 py-2 text-left text-muted-foreground text-xs hover:text-foreground"
          onClick={() => setExpanded(true)}
          type="button"
        >
          Show {hidden} older {hidden === 1 ? "version" : "versions"}
        </button>
      ) : null}
    </section>
  );
}
