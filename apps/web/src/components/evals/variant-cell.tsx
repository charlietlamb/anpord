import { harnessPresentation } from "@/lib/evals/variant-presentation";

export function VariantCell({
  harness,
  model,
}: {
  readonly harness: string;
  readonly model: string;
}) {
  const { Icon, label } = harnessPresentation(harness);

  return (
    <span className="flex min-w-0 items-center gap-2.5 text-foreground">
      <Icon
        aria-label={label}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="truncate">{model}</span>
    </span>
  );
}
