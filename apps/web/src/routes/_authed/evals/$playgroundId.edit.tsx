import type { EvalDraft } from "@anpord/schema/domain/evals";
import { columnsOfDraft, draftOfConfig } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { EvalForm } from "@/components/evals/eval-form";
import { PageShell } from "@/components/layout/page-shell";
import {
  useRunPlayground,
  useSavePlayground,
} from "@/lib/evals/eval-mutations";
import { evalQueries } from "@/lib/evals/eval-queries";
import { DEFAULT_HARNESS } from "@/lib/evals/variant-options";

export const Route = createFileRoute("/_authed/evals/$playgroundId/edit")({
  component: EditEvalScreen,

  ssr: false,

  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(evalQueries.models(DEFAULT_HARNESS)),
      context.queryClient.ensureQueryData(
        evalQueries.playground(params.playgroundId)
      ),
    ]),
  staticData: { title: "Edit eval" },
});

function EditEvalScreen() {
  const { playgroundId } = Route.useParams();
  const navigate = useNavigate();
  const playground = useSuspenseQuery(evalQueries.playground(playgroundId));
  const save = useSavePlayground();
  const run = useRunPlayground();

  const submitting = save.isPending || run.isPending;

  const start = async (draft: EvalDraft) => {
    try {
      await save.mutateAsync({
        config: {
          cases: draft.cases,
          columns: columnsOfDraft(draft),
          connections: draft.connections,
          prompt: draft.prompt,
          trials: draft.trials,
        },
        id: playgroundId,
        name: draft.name === "" ? playground.data.name : draft.name,
      });

      const started = await run.mutateAsync(playgroundId);

      navigate({ params: { runId: started.id }, to: "/evals/$runId" });
    } catch (error) {
      toast.error("Couldn't save the eval", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <PageShell
      leading={<PageHeading icon={FlaskIcon} title={playground.data.name} />}
      width="wide"
    >
      <EvalForm
        initial={draftOfConfig(playground.data.config, playground.data.name)}
        onSubmit={start}
        submitLabel="Save and run"
        submitting={submitting}
      />
    </PageShell>
  );
}
