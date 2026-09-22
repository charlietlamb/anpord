import type { ReactNode } from "react";
import { Swap } from "@/components/layout/swap";

export function EvalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto [container-type:size]">
      <div className="grid min-h-full w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {children}
      </div>
    </div>
  );
}

export function EvalMain({ children }: { readonly children: ReactNode }) {
  return (
    <div className="order-1 flex w-full min-w-0 max-w-6xl flex-col gap-6 px-5 pt-5 pb-8 xl:px-6">
      {children}
    </div>
  );
}

export function EvalRail({
  children,
  swapKey = "rail",
}: {
  readonly children: ReactNode;
  readonly swapKey?: string;
}) {
  return (
    <aside className="order-2 min-w-0 px-5 pb-8 lg:border-l lg:bg-sidebar lg:px-0 lg:pb-0">
      <div className="flex flex-col gap-5 lg:sticky lg:top-0 lg:max-h-[100cqh] lg:overflow-y-auto lg:px-5 lg:pt-5 lg:pb-8 lg:[scrollbar-width:thin]">
        <Swap className="flex flex-col gap-5" swapKey={swapKey}>
          {children}
        </Swap>
      </div>
    </aside>
  );
}
