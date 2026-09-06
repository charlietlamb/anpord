import type { ReactNode } from "react";

interface PromptEditorLayoutProps {
  readonly children: ReactNode;
}

export function PromptEditorLayout({ children }: PromptEditorLayoutProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* The columns carry their own vertical padding: a sticky rail measured against a padded row stops short of the edge. */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-8 px-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:gap-10 xl:px-6">
        {children}
      </div>
    </div>
  );
}

export function PromptEditorMain({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <main className="relative flex min-w-0 flex-col pt-5 pb-24">
      {children}
    </main>
  );
}
