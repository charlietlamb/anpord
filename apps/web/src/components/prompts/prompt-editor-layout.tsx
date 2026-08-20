import type { ReactNode } from "react";

interface PromptEditorLayoutProps {
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
export function PromptEditorLayout({ children }: PromptEditorLayoutProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* The columns carry their own vertical padding: a sticky rail measured
          against a padded row would stop short of the screen's edge. */}
      {/* The rail holds a row of controls and a list of messages, so it is
          sized to the wider of the two rather than to the labels alone. */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-8 px-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}
