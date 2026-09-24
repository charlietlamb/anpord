import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import type { ReactNode } from "react";

export function SkeletonPair({
  children,
  name,
}: {
  readonly children: ReactNode;
  readonly name: string;
}) {
  return (
    <section className="flex flex-col gap-3" data-pair={name}>
      <span className="font-medium text-muted-foreground text-xs">{name}</span>
      <div className="grid grid-cols-2 gap-6">
        <div data-probe="loaded">{children}</div>
        <div data-probe="skeleton">
          <SkeletonScope>{children}</SkeletonScope>
        </div>
      </div>
    </section>
  );
}
