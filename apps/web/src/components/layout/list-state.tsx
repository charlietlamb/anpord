import { EmptyState } from "@anpord/ui/components/empty-state";
import type { ReactNode } from "react";

interface ListStateProps {
  /** A way out. An empty list that offers nothing tells a reader they have
   * arrived somewhere with nothing to do and no way to change that. */
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly description?: string;
  readonly empty: boolean;
  /** Distinct from empty, which would otherwise claim there is nothing here
   * when the request simply failed. */
  readonly error: Error | null;
  /** Shown above the title where a list has nothing to show, so an empty page
   * reads as a place that is empty rather than as one still loading. */
  readonly icon?: ReactNode;
  readonly isPending: boolean;
  /** What to hold the layout with while the rows are on their way. */
  readonly skeleton: ReactNode;
  /** Names what is missing, so "no prompts yet" and "nothing matches that"
   * cannot be told apart only by the reader's memory of what they typed. */
  readonly title: string;
}

/**
 * The four states a list is ever in, in one place, so a page cannot decide
 * that loading looks one way here and another way one screen over.
 */
export function ListState({
  action,
  children,
  description,
  empty,
  icon,
  error,
  isPending,
  skeleton,
  title,
}: ListStateProps) {
  if (isPending) {
    return <>{skeleton}</>;
  }

  if (error) {
    return (
      <EmptyState
        className="mx-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
        description={error.message}
        title="Couldn't load this"
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        action={action}
        className="mx-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
        description={description}
        icon={icon}
        title={title}
      />
    );
  }

  return <>{children}</>;
}
