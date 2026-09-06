import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";
import {
  harnessLabel,
  harnessPresentation,
  type LabelledProfile,
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

export function VariantLabel({
  children,
  className,
  Icon,
  size = "default",
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly Icon: RailIcon;
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
  profile,
  size,
  version,
}: {
  readonly harness: string;
  readonly profile?: LabelledProfile | null;
  readonly version?: string;
} & Sized) {
  const own = harnessPresentation(harness);

  return (
    <VariantLabel Icon={own.Icon} size={size}>
      {harnessLabel(harness, version, profile)}
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
