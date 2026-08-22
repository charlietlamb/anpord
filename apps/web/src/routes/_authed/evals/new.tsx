import type { EvalDraft } from "@anpord/schema/domain/evals";
import { columnsOfDraft } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { FlaskIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { EvalForm } from "@/components/evals/eval-form";
import { PageShell } from "@/components/layout/page-shell";
import {
  useCreatePlayground,
  useRunPlayground,
  useSavePlayground,
} from "@/lib/evals/eval-mutations";

export const Route = createFileRoute("/_authed/evals/new")({
  component: NewEvalScreen,
  staticData: { title: "New eval" },
});

function NewEvalScreen() {
  const navigate = useNavigate();
  const create = useCreatePlayground();
  const save = useSavePlayground();
  const run = useRunPlayground();

  const submitting = create.isPending || save.isPending || run.isPending;

  /* Created, saved, then run. The playground is the record of what was asked
     for and outlives the run it produced, so a person who wants the same grid
     again edits it rather than retyping it. */
  const start = async (draft: EvalDraft) => {
    try {
      const playground = await create.mutateAsync(
        draft.name === "" ? draft.cases[0]?.name || "New eval" : draft.name
      );

      await save.mutateAsync({
        config: {
          cases: draft.cases,
          columns: columnsOfDraft(draft),
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
      leading={<PageHeading icon={FlaskIcon} title="New eval" />}
      width="wide"
    >
      <EvalForm onSubmit={start} submitting={submitting} />
    </PageShell>
  );
}
