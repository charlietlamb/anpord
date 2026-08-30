import type { EvalDraft } from "@anpord/schema/domain/evals";
import { columnsOfDraft } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { Segmented } from "@anpord/ui/components/ui/segmented";
import { FlaskIcon } from "@phosphor-icons/react";
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
  { label: "Dashboard", value: "dashboard" },
  { label: "Agent", value: "agent" },
];

export const Route = createFileRoute("/_authed/evals/new")({
  component: NewEvalScreen,

  ssr: false,

  loader: ({ context }) =>
    context.queryClient.ensureQueryData(evalQueries.models(DEFAULT_HARNESS)),
  staticData: { title: "New eval" },
});

function NewEvalScreen() {
  const [tab, setTab] = useState<Tab>("dashboard");
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
      /* The two ways to write one, rather than the dashboard form presented
         as the only way: an eval that lives in the repository is versioned
         and runs in CI, which the form can never be. */
      actions={<Segmented onChange={setTab} options={TABS} value={tab} />}
      leading={<PageHeading icon={FlaskIcon} title="New eval" />}
      width="wide"
    >
      {tab === "dashboard" ? (
        <EvalForm onSubmit={start} submitting={submitting} />
      ) : (
        <AgentSetup />
      )}
    </PageShell>
  );
}
