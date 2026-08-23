import type { ReactNode } from "react";

export function PreviewScreen({
  children,
  name,
}: {
  readonly children: ReactNode;
  readonly name: string;
}) {
  return (
    <section className="flex flex-col">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-5 py-3 xl:px-6">
        <span className="font-medium text-muted-foreground text-xs">
          {name}
        </span>
        <span className="h-px flex-1 bg-border-faint" />
      </div>
      {children}
    </section>
  );
}
