import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PromptsBody } from "@/components/prompts/prompts-body";
import { promptQueries } from "@/lib/query/prompt-queries";

export const Route = createFileRoute("/_authed/prompts/")({
  component: PromptsPage,
});

/** Fetched on the client: the list is session-scoped and needs the cookie. */
function PromptsPage() {
  const { data: prompts, isPending, error } = useQuery(promptQueries.list());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col overflow-y-auto px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Prompts</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Version and deploy the prompts your application runs on.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          to="/prompts/new"
        >
          <PlusIcon weight="bold" />
          New prompt
        </Link>
      </div>

      <PromptsBody error={error} isPending={isPending} prompts={prompts} />
    </div>
  );
}
