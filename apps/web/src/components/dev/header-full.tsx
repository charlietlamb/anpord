import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import {
  HEADER_PRESETS,
  type HeaderPreset,
} from "@anpord/ui/lib/header-presets";
import { cn } from "@anpord/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { Landing } from "@/components/landing/landing";

const PILL = cn(
  buttonVariants({ size: "sm", variant: "ghost" }),
  "rounded-full"
);

const around = (index: number, step: number) =>
  HEADER_PRESETS[
    (index + step + HEADER_PRESETS.length) % HEADER_PRESETS.length
  ] as HeaderPreset;

export function HeaderFull({ preset }: { readonly preset: HeaderPreset }) {
  const navigate = useNavigate();
  const index = HEADER_PRESETS.indexOf(preset);
  const previous = around(index, -1);
  const next = around(index, 1);
  const show = (id?: string) =>
    navigate({ search: id === undefined ? {} : { id }, to: "/dev/headers" });

  useShortcut("ArrowLeft", { onTrigger: () => show(previous.id) });
  useShortcut("ArrowRight", { onTrigger: () => show(next.id) });
  useShortcut("Escape", { onTrigger: () => show() });

  return (
    <>
      <Landing header={preset} />
      <nav className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-background/80 p-1 shadow-lg backdrop-blur-md">
        <Link className={PILL} search={{}} to="/dev/headers">
          All
        </Link>
        <Link className={PILL} search={{ id: previous.id }} to="/dev/headers">
          ←
        </Link>
        <span className="px-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {index + 1}
          </span>{" "}
          {preset.name}
        </span>
        <Link className={PILL} search={{ id: next.id }} to="/dev/headers">
          →
        </Link>
      </nav>
    </>
  );
}
