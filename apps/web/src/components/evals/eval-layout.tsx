import type { ReactNode } from "react";

export function EvalMain({ children }: { readonly children: ReactNode }) {
  return (
    <div className="order-1 flex w-full min-w-0 max-w-6xl flex-col gap-6 px-5 pt-4 pb-8 xl:px-6">
      {children}
    </div>
  );
}
