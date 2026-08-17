import type { ChannelPlacement } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { useRelativeTime } from "@/lib/use-relative-time";

interface LiveLineProps {
  readonly pending: boolean;
  /** Null once loaded and nothing is published, which reads differently from
   * still loading. */
  readonly placement: ChannelPlacement | null;
  readonly viewingVersion: number;
}

function Moved({ placement }: { readonly placement: ChannelPlacement }) {
  const when = useRelativeTime(placement.updatedAt);

  return (
    <span>
      {placement.updatedBy
        ? ` Moved by ${placement.updatedBy.name} `
        : " Moved "}
      {when}.
    </span>
  );
}

/**
 * What callers receive right now, stated above the prompt in one sentence.
 *
 * The editor otherwise gives no signal: reading v3 looks the same whether v3 is
 * live or three versions behind, so the question every author actually has, am I
 * looking at what my users get, could only be answered by scanning the
 * rail. The grammar stays the same in every state, so the answer is always in
 * the same place.
 */
export function LiveLine({
  pending,
  placement,
  viewingVersion,
}: LiveLineProps) {
  if (pending) {
    return (
      <div className="flex h-5 items-center">
        <Skeleton className="h-3.5 w-52" />
      </div>
    );
  }

  if (!placement) {
    return (
      <p className="text-[0.8125rem] text-muted-foreground">
        <span className="font-medium text-foreground">Not live yet.</span> Point{" "}
        {PRODUCTION} at a version to publish it.
      </p>
    );
  }

  const viewingLive = placement.version === viewingVersion;

  return (
    <p className="text-[0.8125rem] text-muted-foreground">
      <span className="font-medium text-foreground">Production</span> serves{" "}
      <span className="font-medium text-foreground tabular-nums">
        v{placement.version}
      </span>
      {viewingLive ? (
        ", the version you are reading."
      ) : (
        <>
          {`, not the v${viewingVersion} you are reading.`}
          <Moved placement={placement} />
        </>
      )}
    </p>
  );
}
