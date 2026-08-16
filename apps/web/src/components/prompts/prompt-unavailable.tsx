import { EmptyState } from "@anpord/ui/components/empty-state";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { TextTIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

interface PromptUnavailableProps {
  readonly failed: boolean;
}

export function PromptUnavailable({ failed }: PromptUnavailableProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <EmptyState
        action={
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            to="/prompts"
          >
            Back to prompts
          </Link>
        }
        className="max-w-md"
        description={
          failed
            ? "The request didn't reach the server. Try again in a moment."
            : "It may have been archived, or the address may be wrong."
        }
        icon={<TextTIcon />}
        title={failed ? "Couldn't load this prompt" : "Prompt not found"}
      />
    </div>
  );
}
