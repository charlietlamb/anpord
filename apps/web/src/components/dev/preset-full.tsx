import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Preset, PresetKind } from "@/components/dev/preset-kind";

const PILL = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "rounded-full"
);

const around = <P,>(presets: readonly P[], index: number, step: number) =>
  presets[(index + step + presets.length) % presets.length] as P;

export function PresetFull<P extends Preset>({
  kind,
  preset,
}: {
  readonly kind: PresetKind<P>;
  readonly preset: P;
}) {
  const navigate = useNavigate();
  const index = kind.presets.indexOf(preset);
  const previous = around(kind.presets, index, -1);
  const next = around(kind.presets, index, 1);
  const show = (id?: string) =>
    navigate({ search: id === undefined ? {} : { id }, to: kind.to });

  useShortcut("ArrowLeft", { onTrigger: () => show(previous.id) });
  useShortcut("ArrowRight", { onTrigger: () => show(next.id) });
  useShortcut("Escape", { onTrigger: () => show() });

  return (
    <>
      {kind.landing(preset)}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-6",
          kind.navLayer,
          "mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-background/80 p-1 shadow-lg backdrop-blur-md"
        )}
      >
        <Link className={PILL} search={{}} to={kind.to}>
          All
        </Link>
        <Link
          aria-label="Previous preset"
          className={PILL}
          search={{ id: previous.id }}
          to={kind.to}
        >
          ←
        </Link>
        <span className="px-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {index + 1}
          </span>{" "}
          {preset.name}
        </span>
        <Link
          aria-label="Next preset"
          className={PILL}
          search={{ id: next.id }}
          to={kind.to}
        >
          →
        </Link>
      </nav>
    </>
  );
}
