import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@anpord/ui/components/ui/empty";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  action?: ReactNode;
  bordered?: boolean;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({
  action,
  bordered = true,
  className,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "relative overflow-hidden",
        /* Dashed, and a step fainter than a real edge: this outlines a
           space waiting to be filled rather than a container holding
           something, and a solid rule says the opposite. */
        bordered && "border border-border-faint border-dashed",
        className
      )}
    >
      <EmptyHeader className="relative">
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? (
        <EmptyContent className="relative">{action}</EmptyContent>
      ) : null}
    </Empty>
  );
}
