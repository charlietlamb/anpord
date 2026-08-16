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
import { Dither } from "./ui/dither";

interface EmptyStateProps {
  action?: ReactNode;
  bordered?: boolean;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  texture?: boolean;
  title: string;
}

export function EmptyState({
  action,
  bordered = true,
  className,
  description,
  icon,
  texture = false,
  title,
}: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "relative overflow-hidden",
        bordered && "border",
        className
      )}
    >
      {texture ? <Dither className="text-foreground/[0.07]" /> : null}
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
