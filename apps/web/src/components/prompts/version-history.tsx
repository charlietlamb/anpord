import type { ResolvedPrompt } from "@anpord/schema/prompts";
import { cn } from "@anpord/ui/lib/utils";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
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
    <section className="mt-4 rounded-xl px-1.5 pb-1.5 shadow-[inset_0_0_0_1px_oklch(0_0_0/5%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%)]">
      <h2 className="px-2.5 pt-2.5 pb-1.5 font-medium text-muted-foreground text-xs">
        Versions
      </h2>

      <ul>
        {shown.map((version, index) => {
          const live = version.version === liveVersion;
          const selected = version.version === selectedVersion;
          const first = index === 0;
          const last = index === shown.length - 1;

          return (
            <li key={version.versionId}>
              <div
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors",
                  selected ? "bg-muted/60" : "hover:bg-muted/40"
                )}
              >
                {/* The rail makes the sequence legible; the ring lifts the
                    node off the line it sits on. */}
                <span
                  aria-hidden="true"
                  className="relative flex w-3.5 shrink-0 justify-center self-stretch"
                >
                  <span
                    className={cn(
                      "absolute w-px bg-border",
                      first ? "top-1/2" : "top-[-0.625rem]",
                      last ? "bottom-1/2" : "bottom-[-0.625rem]"
                    )}
                  />
                  <span
                    className={cn(
                      "relative size-[7px] self-center rounded-full ring-[3px] ring-card",
                      live ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                </span>

                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                  onClick={() => onSelect(version)}
                  type="button"
                >
                  {/* The content is what you scan when choosing a version;
                      the message, when there is one, says why it changed. */}
                  <span className="truncate text-foreground/80">
                    {version.commitMessage ?? version.content}
                  </span>
                </button>

                {/* Right-aligned so the numbers hold a column as they grow. */}
                <span className="ml-2 w-8 shrink-0 text-right font-medium text-muted-foreground text-xs tabular-nums">
                  v{version.version}
                </span>

                <span className="flex w-5 shrink-0 justify-center">
                  {version.author ? <UserAvatar user={version.author} /> : null}
                </span>

                <span className="w-24 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                  {isClient ? when(version.createdAt, now) : null}
                </span>

                {/* Reserved either way, so the timestamps stay in a column. */}
                <span className="flex w-5 shrink-0 justify-end">
                  {live ? null : (
                    <button
                      aria-label={`Restore v${version.version}`}
                      className="rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      onClick={() => onRestore(version)}
                      type="button"
                    >
                      <ArrowCounterClockwiseIcon size={14} />
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        <button
          className="w-full rounded-lg px-2.5 py-2 text-left text-muted-foreground text-xs hover:text-foreground"
          onClick={() => setExpanded(true)}
          type="button"
        >
          Show {hidden} older {hidden === 1 ? "version" : "versions"}
        </button>
      ) : null}
    </section>
  );
}
