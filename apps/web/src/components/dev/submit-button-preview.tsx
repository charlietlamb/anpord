import { Kbd } from "@anpord/ui/components/ui/kbd";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";

export interface ButtonOption {
  readonly caps: string;
  readonly note: string;
  readonly shell: string;
  readonly title: string;
}

export function SubmitButton({
  caps,
  shell,
  radius,
}: {
  caps: string;
  radius: string;
  shell: string;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center gap-2 pr-2 pl-3 font-medium text-sm transition-colors",
        radius,
        shell
      )}
      type="button"
    >
      <PlusIcon size={15} weight="bold" />
      Create prompt
      <span className="flex items-center gap-0.5">
        <Kbd className={caps}>⌘</Kbd>
        <Kbd className={caps}>↵</Kbd>
      </span>
    </button>
  );
}

/** Shown on the real surface, since that is the only context that matters. */
export function OnSurface({ option }: { option: ButtonOption }) {
  return (
    <div className="rounded-[18px] bg-card p-3 shadow-[inset_0_0_0_1px_oklch(0_0_0/4%),0_2px_6px_oklch(0_0_0/5%),0_12px_32px_-16px_oklch(0_0_0/14%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%),0_2px_6px_oklch(0_0_0/25%),0_12px_32px_-16px_oklch(0_0_0/50%)]">
      <p className="px-1 pt-1 pb-6 text-muted-foreground text-sm">
        You are a concise support agent.
      </p>
      <div className="flex justify-end">
        <SubmitButton
          caps={option.caps}
          radius="rounded-lg"
          shell={option.shell}
        />
      </div>
    </div>
  );
}
