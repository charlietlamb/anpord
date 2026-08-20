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
 * The two panes scroll independently: the rail describes the prompt, so
 * reaching the end of a long prompt should not carry its channels off screen.
 * The actions sit above both, since saving cannot depend on scrolling back.
 */
export function PromptEditorLayout({
  actions,
  children,
}: PromptEditorLayoutProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-4xl justify-end px-5 pt-3 xl:px-6">
        <div className="pointer-events-auto">{actions}</div>
      </div>

      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-1 gap-8 px-5 pt-14 lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}
