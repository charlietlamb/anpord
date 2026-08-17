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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-6">
      <div className="mx-auto w-full max-w-5xl px-6 xl:px-8">{header}</div>

      {/* The rail sets the height both columns share, so a long prompt
          scrolls inside its own box rather than running on past the cards
          beside it and leaving an empty column. */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8 xl:px-8">
        {children}
      </div>
    </div>
  );
}
