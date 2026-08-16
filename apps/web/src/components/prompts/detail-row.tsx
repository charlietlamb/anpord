import type { ReactNode } from "react";

interface DetailRowProps {
  readonly children: ReactNode;
  readonly label: string;
}

export function DetailRow({ children, label }: DetailRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">
        {children}
      </span>
    </div>
  );
}
