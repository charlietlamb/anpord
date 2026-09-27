import { Link } from "@tanstack/react-router";
import type { Preset, PresetKind } from "@/components/dev/preset-kind";
import { useViewport } from "@/components/dev/use-viewport";
import { useWatchedBox } from "@/components/dev/use-watched-box";

export function PresetThumb<P extends Preset>({
  kind,
  number,
  preset,
}: {
  readonly kind: PresetKind<P>;
  readonly number: number;
  readonly preset: P;
}) {
  const viewport = useViewport();
  const box = useWatchedBox<HTMLDivElement>();

  return (
    <figure className="group relative flex flex-col gap-2">
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-background transition-colors group-hover:border-foreground/30 group-has-focus-visible:ring-2 group-has-focus-visible:ring-ring"
        ref={box.ref}
        style={{
          aspectRatio: `${viewport.width} / ${viewport.height * kind.heightRatio}`,
        }}
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
            {kind.landing(preset)}
          </div>
        )}
      </div>
      <figcaption className="flex items-baseline gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">{number}</span>
        <Link
          className="outline-none after:absolute after:inset-0"
          search={{ id: preset.id }}
          to={kind.to}
        >
          {preset.name}
        </Link>
        {kind.caption?.(preset)}
      </figcaption>
    </figure>
  );
}
