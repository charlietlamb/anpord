import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorCard } from "@/components/layout/error-card";

export function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <ErrorCard
      description="Something went wrong while loading this page."
      detail={error.message}
      onRetry={reset}
      title="Unexpected error"
    />
  );
}
