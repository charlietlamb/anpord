import type { EvalCell } from "@anpord/schema/domain/evals";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import {
  CheckSquareIcon,
  FileCodeIcon,
  FilesIcon,
  FlaskIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CellRail } from "@/components/evals/cell-rail";
import { CellSetup } from "@/components/evals/cell-setup";
import { CellSkeleton } from "@/components/evals/cell-skeleton";
import { EvalLayout, EvalMain } from "@/components/evals/eval-layout";
import { RerunCellButton } from "@/components/evals/rerun-cell-button";
import { TrialArtifacts } from "@/components/evals/trial-artifacts";
import { TrialSections } from "@/components/evals/trial-sections";
import { TrialTable } from "@/components/evals/trial-table";
import { ValidationInspector } from "@/components/evals/validation-inspector";
import { ErrorCard } from "@/components/layout/error-card";
import { evalQueries } from "@/lib/evals/eval-queries";

/* A file every trial produced identically belongs to the cell rather than to
   one of its trials. */
const sharedArtifacts = (trials: EvalCell["trials"]) => {
  const source = trials.find((entry) => entry.artifacts?.length);
  const files = source?.artifacts?.filter((file) =>
    trials.every((entry) =>
      entry.artifacts?.some((candidate) => candidate.sha256 === file.sha256)
    )
  );

  return source && files?.length ? { files, ordinal: source.ordinal } : null;
};

export const Route = createFileRoute("/_authed/evals/$runId/cells/$cellKey/")({
  component: CellScreen,
  ssr: false,
  /* Not returned: the run this screen renders from is already ensured by the
     parent, so history streams in rather than holding the navigation. */
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(evalQueries.history(params.cellKey));
  },
});

function CellScreen() {
  const { cellKey, runId } = Route.useParams();
  const { data: run } = useQuery(evalQueries.detail(runId));

  const cell = run?.cells.find((candidate) => candidate.cellKey === cellKey);
  const shared = cell ? sharedArtifacts(cell.trials) : null;

  if (run === undefined) {
    return <CellSkeleton cellKey={cellKey} runId={runId} />;
  }

  if (cell === undefined) {
    return (
      <ErrorCard
        description="This run has no cell with that key."
        title="Could not find this cell"
      />
    );
  }

  return (
    <EvalLayout>
      <EvalMain>
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <PageHeading icon={FlaskIcon} title={cell.caseName} />
            <RerunCellButton
              cellKey={cellKey}
              runId={runId}
              trials={cell.trials.length}
            />
          </div>

          <TrialTable cellKey={cellKey} runId={runId} trials={cell.trials} />
        </section>

        <TrialSections
          sections={[
            ...(shared
              ? [
                  {
                    Icon: FilesIcon,
                    content: (
                      <TrialArtifacts
                        artifacts={shared.files}
                        titled={false}
                        trial={{ id: runId, cellKey, ordinal: shared.ordinal }}
                      />
                    ),
                    label: "Files",
                    value: "files",
                  },
                ]
              : []),
            {
              Icon: CheckSquareIcon,
              content: (
                <ValidationInspector
                  files={cell.setup?.validatorFiles}
                  key={cellKey}
                  titled={false}
                  trials={cell.trials}
                />
              ),
              label: "Validation",
              value: "validation",
            },
            ...(cell?.setup?.validatorFiles?.length
              ? [
                  {
                    Icon: FileCodeIcon,
                    content: (
                      <ValidationInspector
                        files={cell.setup.validatorFiles}
                        titled={false}
                        trials={cell.trials}
                        view="source"
                      />
                    ),
                    label: "Source",
                    value: "source",
                  },
                ]
              : []),
            ...(cell.setup === null
              ? []
              : [
                  {
                    Icon: SlidersHorizontalIcon,
                    content: (
                      <CellSetup setup={cell.setup} trials={cell.trials} />
                    ),
                    label: "Setup",
                    value: "setup",
                  },
                ]),
          ]}
        />
      </EvalMain>

      <CellRail
        cell={cell}
        cellKey={cellKey}
        runId={runId}
        task={run.tasks[cell.taskIndex]}
        trigger={run.trigger}
      />
    </EvalLayout>
  );
}
