import type { EvalDraft } from "@anpord/schema/domain/evals";
import { columnsOfDraft } from "@anpord/schema/domain/evals";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AgentSetup } from "@/components/evals/agent-setup";
import { EvalForm } from "@/components/evals/eval-form";
import { PageShell } from "@/components/layout/page-shell";
import {
  useCreatePlayground,
  useRunPlayground,
  useSavePlayground,
} from "@/lib/evals/eval-mutations";
import { evalQueries } from "@/lib/evals/eval-queries";
import { DEFAULT_HARNESS } from "@/lib/evals/variant-options";

type Tab = "agent" | "dashboard";

const TABS: readonly { readonly label: string; readonly value: Tab }[] = [
  { label: "Agent", value: "agent" },
  { label: "Dashboard", value: "dashboard" },
];

export const Route = createFileRoute("/_authed/evals/new")({
  component: NewEvalScreen,

  ssr: false,

  loader: ({ context }) =>
    context.queryClient.ensureQueryData(evalQueries.models(DEFAULT_HARNESS)),
  staticData: { title: "New eval" },
});

function NewEvalScreen() {
  const [tab, setTab] = useState<Tab>("agent");
  const navigate = useNavigate();
  const create = useCreatePlayground();
  const save = useSavePlayground();
  const run = useRunPlayground();

  const submitting = create.isPending || save.isPending || run.isPending;

  const start = async (draft: EvalDraft) => {
    try {
      const playground = await create.mutateAsync(
        draft.name === "" ? draft.cases[0]?.name || "New eval" : draft.name
      );

      await save.mutateAsync({
        config: {
          cases: draft.cases,
          columns: columnsOfDraft(draft),
          connections: draft.connections,
          prompt: draft.prompt,
          trials: draft.trials,
        },
        id: playground.id,
        name: playground.name,
      });

      const started = await run.mutateAsync(playground.id);

      navigate({ params: { runId: started.id }, to: "/evals/$runId" });
    } catch (error) {
      toast.error("Couldn't start the eval", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <PageShell
      /* The tabs stand where the title would. The breadcrumb above already
         says New eval, and each panel names itself, so a heading here would
         be the third statement of the same thing. */
      leading={<PageTabs onChange={setTab} options={TABS} value={tab} />}
      width="wide"
    >
      {tab === "agent" ? (
        <AgentSetup />
      ) : (
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-1">
            <h2 className="font-heading text-base tracking-tight">
              Write an eval here
            </h2>
            <p className="max-w-prose text-muted-foreground text-xs">
              One case, run now. Good for trying a goal out; an eval you mean to
              keep belongs in the repository.
            </p>
          </header>

          <EvalForm onSubmit={start} submitting={submitting} />
        </div>
      )}
    </PageShell>
  );
}
