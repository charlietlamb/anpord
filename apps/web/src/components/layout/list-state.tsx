import { EmptyState } from "@anpord/ui/components/empty-state";
import type { ReactNode } from "react";

interface ListStateProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly description?: string;
  readonly empty: boolean;
  readonly error: Error | null;
  readonly icon?: ReactNode;
  readonly isPending: boolean;
  readonly skeleton: ReactNode;
  readonly title: string;
}

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
        className="m-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
        description={error.message}
        title="Couldn't load this"
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        action={action}
        className="m-auto max-h-64 w-full max-w-md flex-none gap-3 py-10"
        description={description}
        icon={icon}
        title={title}
      />
    );
  }

  return <>{children}</>;
}
