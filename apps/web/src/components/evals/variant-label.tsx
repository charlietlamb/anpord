import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import {
  harnessPresentation,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/**
 * A thing a run was pointed at -- a model, a harness, a sandbox -- named
 * beside its mark.
 *
 * One component because every list, rail and chip had drawn this pair for
 * itself, and they had drifted: some set the mark in the text colour, some
 * the text in the mark's, and a row could carry both in one line. Here the
 * mark is always muted and the name always foreground, so the eye lands on
 * the word and the logo confirms it rather than competing with it.
 */
export function VariantLabel({
  children,
  className,
  Icon,
  size = "default",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly Icon: RailIcon;
  /** `compact` for a chip, where the mark sits a step smaller. */
  readonly size?: "compact" | "default";
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-foreground",
        className
      )}
    >
      <Icon
        className={cn(
          "shrink-0 text-muted-foreground",
          size === "compact" ? "size-3" : "size-3.5"
        )}
      />
      <span className="truncate">{children}</span>
    </span>
  );
}

interface Sized {
  readonly size?: "compact" | "default";
}

export function ModelLabel({
  model,
  size,
}: { readonly model: string } & Sized) {
  const own = modelPresentation(model);

  return (
    <VariantLabel Icon={own.Icon} size={size}>
      {own.label}
    </VariantLabel>
  );
}

export function HarnessLabel({
  harness,
  size,
  version,
}: { readonly harness: string; readonly version?: string } & Sized) {
  const own = harnessPresentation(harness);

  return (
    <VariantLabel Icon={own.Icon} size={size}>
      {version === undefined ? own.label : `${own.label} ${version}`}
    </VariantLabel>
  );
}

export function SandboxLabel({
  provider,
  size,
}: { readonly provider: string } & Sized) {
  const own = providerPresentation(provider);

  return (
    <VariantLabel Icon={own.Icon} size={size}>
      {own.label}
    </VariantLabel>
  );
}
