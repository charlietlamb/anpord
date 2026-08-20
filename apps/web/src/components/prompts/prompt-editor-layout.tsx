import type { ReactNode } from "react";

interface PromptEditorLayoutProps {
  /** Floated over the top of the page, clear of what scrolls beneath. */
  readonly actions: ReactNode;
  /** The prompt and its rail, in that order. */
  readonly children: ReactNode;
}

/**
 * The shell the editor and its loading state share, so the two cannot drift
 * apart and swap the page's width underneath a reader mid-load.
 *
 * One scrollbar, at the edge of the screen where a page's scrollbar belongs.
 * The rail sticks rather than scrolling with the prompt, so it stays in view
 * without opening a second scroller in the middle of the page.
 */
export function PromptEditorLayout({
  actions,
  children,
}: PromptEditorLayoutProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Overlaid rather than stacked, so the prompt scrolls the whole height
          of the page and passes under the controls instead of starting below
          them. Only the buttons take the pointer; the rest stays scrollable. */}
      <div className="pointer-events-none sticky top-0 z-10 mx-auto flex w-full max-w-4xl shrink-0 justify-end px-5 pt-3 xl:px-6">
        <div className="pointer-events-auto">{actions}</div>
      </div>

      {/* Pulled back under the sticky row, which would otherwise reserve its
          own height and start the prompt a button's depth down the page. */}
      <div className="mx-auto -mt-11 grid w-full max-w-4xl grid-cols-1 items-start gap-8 px-5 pt-4 pb-24 lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}
