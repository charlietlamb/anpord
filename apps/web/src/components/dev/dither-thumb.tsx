import type { DitherPreset } from "@anpord/ui/lib/dither-presets";
import { Link } from "@tanstack/react-router";
import { useViewport } from "@/components/dev/use-viewport";
import { useWatchedBox } from "@/components/dev/use-watched-box";
import { Landing } from "@/components/landing/landing";

export function DitherThumb({
  number,
  preset,
}: {
  readonly number: number;
  readonly preset: DitherPreset;
}) {
  const viewport = useViewport();
  const box = useWatchedBox<HTMLDivElement>();

  return (
    <figure className="group relative flex flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-background transition-colors group-hover:border-foreground/30 group-has-focus-visible:ring-2 group-has-focus-visible:ring-ring"
        ref={box.ref}
        style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}
      >
        {box.visible && box.width > 0 && (
          <div
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            inert
            style={{
              height: viewport.height,
              transform: `scale(${box.width / viewport.width})`,
              width: viewport.width,
            }}
          >
            <Landing dither={preset} />
          </div>
        )}
      </div>
      <figcaption className="flex items-baseline gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">{number}</span>
        <Link
          className="outline-none after:absolute after:inset-0"
          search={{ id: preset.id }}
          to="/dev/dithers"
        >
          {preset.name}
        </Link>
      </figcaption>
    </figure>
  );
}
