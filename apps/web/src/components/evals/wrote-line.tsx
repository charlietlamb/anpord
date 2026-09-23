import { KindIcon } from "@/components/evals/kind-icon";

export function WroteLine({ paths }: { readonly paths: readonly string[] }) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground text-sm">
      <KindIcon kind="fileChange" />
      <span className="shrink-0">Wrote</span>
      <span className="min-w-0 truncate font-mono text-foreground text-xs">
        {paths.join(", ")}
      </span>
    </span>
  );
}
