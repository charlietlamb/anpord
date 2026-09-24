import { EmptyState } from "@anpord/ui/components/ui/empty-state";
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
      <EmptyState description={error.message} title="Couldn't load this" />
    );
  }

  if (empty) {
    return (
      <EmptyState
        action={action}
        description={description}
        icon={icon}
        title={title}
      />
    );
  }

  return <>{children}</>;
}
