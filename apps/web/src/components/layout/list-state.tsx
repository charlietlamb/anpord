import { EmptyState } from "@anpord/ui/components/ui/empty-state";
import { SkeletonScope } from "@anpord/ui/components/ui/skeleton-scope";
import type { ReactNode } from "react";

interface ListStateProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly description?: string;
  readonly empty: boolean;
  readonly error: Error | null;
  readonly icon?: ReactNode;
  readonly loading: boolean;
  readonly title: string;
}

export function ListState({
  action,
  children,
  description,
  empty,
  error,
  icon,
  loading,
  title,
}: ListStateProps) {
  if (loading) {
    return <SkeletonScope>{children}</SkeletonScope>;
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

  return children;
}
