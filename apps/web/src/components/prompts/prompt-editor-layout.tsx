import type { ReactNode } from "react";

interface PromptEditorLayoutProps {
  /** The prompt and its rail, in that order. */
  readonly children: ReactNode;
  readonly header: ReactNode;
}

/**
 * The shell the editor and its loading state share, so the two cannot drift
 * apart and swap the page's width underneath a reader mid-load.
 */
export function PromptEditorLayout({
  children,
  header,
}: PromptEditorLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pt-6 lg:absolute lg:inset-0 lg:top-14">
      <div className="mx-auto w-full max-w-5xl px-6 xl:px-8">{header}</div>

      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8 xl:px-8">
        {children}
      </div>
    </div>
  );
}
