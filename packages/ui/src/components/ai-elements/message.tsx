import { cn } from "@anpord/ui/lib/utils";
import type { ComponentProps } from "react";

export type MessageRole = "assistant" | "user";

export const Message = ({
  className,
  from,
  ...props
}: ComponentProps<"div"> & { readonly from: MessageRole }) => (
  <div
    className={cn(
      "group flex w-full flex-col gap-2",
      from === "user"
        ? "is-user ml-auto max-w-[85%] items-end"
        : "is-assistant",
      className
    )}
    {...props}
  />
);

export const MessageContent = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 text-foreground text-sm leading-relaxed [overflow-wrap:anywhere]",
      "group-[.is-user]:whitespace-pre-wrap group-[.is-user]:rounded-lg group-[.is-user]:border group-[.is-user]:border-border group-[.is-user]:bg-card group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:shadow-sm dark:group-[.is-user]:bg-muted",
      "group-[.is-assistant]:w-full",
      className
    )}
    {...props}
  />
);
