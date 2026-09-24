import type { ReactNode } from "react";

export function PromptEditorMain({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <main className="relative flex min-w-0 flex-col pt-5 pb-8">{children}</main>
  );
}
