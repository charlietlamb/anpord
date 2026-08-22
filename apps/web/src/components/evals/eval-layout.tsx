import type { ReactNode } from "react";

/**
 * The shell every eval detail screen shares: the findings in the main column,
 * what produced them in a rail that stays in view.
 *
 * One scrollbar, at the edge of the screen where a page's scrollbar belongs,
 * matching the prompt editor rather than inventing a second geometry for the
 * same shape of page.
 */
export function EvalLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-8 px-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}

/** The main column. Carries its own padding so a sticky rail beside it can
 * still reach the top of the screen. */
export function EvalMain({ children }: { readonly children: ReactNode }) {
  return (
    <div className="order-1 flex min-w-0 flex-col gap-6 pt-5 pb-16">
      {children}
    </div>
  );
}
