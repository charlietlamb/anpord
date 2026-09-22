import { cn } from "@anpord/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export const Conversation = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn("relative w-full", className)} role="log" {...props} />
);

export const ConversationContent = ({
  className,
  ...props
}: ComponentProps<"ol">) => (
  <ol className={cn("flex flex-col gap-5 py-2", className)} {...props} />
);

export const ConversationEmptyState = ({
  className,
  description,
  icon,
  title,
  ...props
}: ComponentProps<"div"> & {
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly title: string;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 px-8 py-12 text-center",
      className
    )}
    {...props}
  >
    {icon ? <div className="text-muted-foreground">{icon}</div> : null}
    <div className="space-y-1">
      <h3 className="font-medium text-sm">{title}</h3>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  </div>
);
