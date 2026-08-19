import { Button } from "@anpord/ui/components/button";
import { EmptyState } from "@anpord/ui/components/empty-state";
import { FlaskIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { CaseEditor } from "@/components/evals/case-editor";
import { ConfigBar } from "@/components/evals/config-bar";
import { ResultsGrid } from "@/components/evals/results-grid";
import { TrialRow } from "@/components/evals/trial-row";
import { usePlayground } from "@/components/evals/use-playground";

export const Route = createFileRoute("/_authed/evals/")({
  component: EvalsPlayground,
});

function EvalsPlayground() {
  const playground = usePlayground();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pt-5 pb-6">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Playground</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Give an agent a goal and a sandbox, run it several times, and see
            what it did rather than only whether it passed.
          </p>
        </div>

        <ConfigBar
          onAddTask={playground.addTask}
          onPromptChange={playground.setPrompt}
          onRun={playground.start}
          onTaskChange={playground.changeTask}
          onTaskRemove={playground.removeTask}
          onTrialsChange={playground.setTrials}
          prompt={playground.prompt}
          running={playground.running}
          tasks={playground.tasks}
          trials={playground.trials}
        />

        {playground.error === null ? null : (
          <p className="text-destructive text-sm">{playground.error.message}</p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Cases</span>
            <Button
              onClick={playground.addCase}
              size="sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon />
              Add case
            </Button>
          </div>

          {playground.cases.map((subject, index) => (
            <CaseEditor
              index={index}
              key={subject.name}
              onChange={(next) => playground.changeCase(index, next)}
              onRemove={() => playground.removeCase(index)}
              removable={playground.cases.length > 1}
              subject={subject}
            />
          ))}
        </div>

        {playground.run === undefined ? (
          <EmptyState
            description="Run the cases to see how many commands each agent took, what it changed, and the exit code of everything it ran."
            icon={<FlaskIcon />}
            texture
            title="No runs yet"
          />
        ) : (
          <div className="space-y-4">
            <ResultsGrid
              onOpen={playground.open}
              run={playground.run}
              selected={playground.selected}
            />

            {playground.selected === undefined ? (
              <p className="text-muted-foreground text-sm">
                Select a square to see the runs behind it.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                {playground.selected.trials.map((trial, index) => (
                  <TrialRow index={index} key={trial.ordinal} trial={trial} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
