import type { ReactNode } from "react";

export function EvalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Stretched, not start-aligned: a start-aligned track is only as tall
          as the rail, leaving its sticky box nothing to hold to once the main
          column scrolls past it. */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-stretch gap-8 px-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}

/* Padding lives here so a sticky rail beside it can still reach the top of the screen. */
export function EvalMain({ children }: { readonly children: ReactNode }) {
  return (
    <div className="order-1 flex min-w-0 flex-col gap-6 pt-5 pb-16">
      {children}
    </div>
  );
}
