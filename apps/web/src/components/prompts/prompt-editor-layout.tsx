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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-5">
      <div className="mx-auto w-full max-w-4xl shrink-0 px-5 xl:px-6">
        {header}
      </div>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-start gap-8 px-5 pt-6 pb-24 lg:grid-cols-[minmax(0,1fr)_15rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}
