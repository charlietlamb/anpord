import { cn } from "@anpord/ui/lib/utils";
import type { ComponentProps } from "react";

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
