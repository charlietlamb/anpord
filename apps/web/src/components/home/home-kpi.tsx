import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function HomeKpi({
  active = false,
  chart,
  label,
  note,
  onSelect,
  tone,
  value,
}: {
  readonly active?: boolean;
  readonly chart?: ReactNode;
  readonly label: string;
  readonly note: ReactNode;
  readonly onSelect?: () => void;
  readonly tone?: string;
  readonly value: string;
}) {
  const body = (
    <>
      <span className="text-muted-foreground/70 text-xs">{label}</span>
      <span className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-semibold text-2xl tabular-nums leading-[30px] tracking-tight",
            tone
          )}
        >
          {value}
        </span>
        {chart}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        {note}
      </span>
    </>
  );

  const frame = "flex min-w-0 flex-1 flex-col gap-1 text-left";

  if (onSelect === undefined) {
    return <div className={frame}>{body}</div>;
  }

  return (
    <button
      aria-pressed={active}
      className={cn(
        frame,
        "-m-2 cursor-pointer rounded-md p-2 transition-colors duration-150 hover:bg-alpha-4",
        active && "bg-alpha-8 hover:bg-alpha-8"
      )}
      onClick={onSelect}
      type="button"
    >
      {body}
    </button>
  );
}
