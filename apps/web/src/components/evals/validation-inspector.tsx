import type { EvalSourceFile } from "@anpord/schema/domain/eval-source-files";
import { Button } from "@anpord/ui/components/button";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon, CheckSquareIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  type ValidationTrial,
  validationKey,
  validationsOf,
} from "@/lib/evals/validation-results";
import { SetupSurface } from "./setup-surface";
import { TrialValidations } from "./trial-validations";
import { ValidationSource } from "./validation-source";

export function ValidationInspector({
  trials,
  files = [],
}: {
  readonly trials: readonly ValidationTrial[];
  readonly files?: readonly EvalSourceFile[];
}) {
  const [source, setSource] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [ordinal, setOrdinal] = useState<string | null>(null);
  const selected =
    trials.length === 1
      ? trials[0]
      : trials.find((trial) => String(trial.ordinal) === ordinal);
  const records = trials.map((trial) => ({
    trial,
    validations: validationsOf(trial),
  }));
  const validations = selected ? validationsOf(selected) : [];
  const groups = new Map(
    records.flatMap(({ validations: entries }) =>
      entries.map((entry) => [validationKey(entry), entry] as const)
    )
  );
  return (
    <SetupSurface
      Icon={CheckSquareIcon}
      meta={
        selected && validations.length
          ? `${validations.filter((entry) => entry.status === "passed").length}/${validations.length} passed`
          : undefined
      }
      title="Validation"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-border-faint border-b">
        <PageTabs
          onChange={(value) => setSource(value === "source")}
          options={[
            { label: "Results", value: "results" },
            { label: "Source", value: "source" },
          ]}
          value={source ? "source" : "results"}
        />
        {!source && trials.length > 1 ? (
          <Select
            onValueChange={(value) => {
              setOrdinal(value);
              setExpandedKey(null);
            }}
            value={selected ? String(selected.ordinal) : "all"}
          >
            <SelectTrigger
              aria-label="Validation trial"
              className="w-auto min-w-28 text-xs"
              size="sm"
              variant="ghost"
            >
              <SelectValue>
                {selected ? `Trial ${selected.ordinal}` : "All trials"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trials</SelectItem>
              {trials.map((trial) => (
                <SelectItem key={trial.ordinal} value={String(trial.ordinal)}>
                  Trial {trial.ordinal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {source ? <ValidationSource files={files} /> : null}
      {!source && selected ? (
        <TrialValidations
          expandedKey={expandedKey}
          key={selected.ordinal}
          /* Closing the card returns to the summary it was opened from, rather
             than leaving one trial selected with no way back to the rest. */
          onCollapse={
            trials.length > 1
              ? () => {
                  setOrdinal(null);
                  setExpandedKey(null);
                }
              : undefined
          }
          validations={validations}
        />
      ) : null}
      {source || selected ? null : (
        <div className="space-y-3">
          {groups.size === 0 ? (
            <p className="py-3 text-muted-foreground text-xs">
              Execution evidence was not recorded for these trials.
            </p>
          ) : (
            [...groups].map(([key, entry]) => {
              const results = records.map(
                ({ trial, validations: entries }) => ({
                  trial,
                  result: entries.find(
                    (candidate) => validationKey(candidate) === key
                  ),
                })
              );
              const target =
                results.find(
                  ({ result }) =>
                    result?.status === "failed" || result?.status === "error"
                ) ?? results.find(({ result }) => result !== undefined);
              const missing = results.filter(
                ({ result }) => result === undefined
              ).length;
              const passed = results.filter(
                ({ result }) => result?.status === "passed"
              ).length;
              /* The same card the row becomes once it is open, so opening one
                 reads as it expanding rather than being replaced. */
              return (
                <Button
                  aria-label={`Inspect ${entry.name} results`}
                  className="h-auto w-full flex-wrap justify-between gap-x-3 gap-y-1.5 rounded-xl border border-border-faint bg-muted/40 px-3 py-2.5 font-normal text-xs transition-colors hover:border-muted-foreground/40"
                  key={key}
                  onClick={() => {
                    setOrdinal(String(target?.trial.ordinal));
                    setExpandedKey(key);
                  }}
                  variant="bare"
                >
                  <span className="min-w-0 break-words font-medium font-mono text-foreground text-xs">
                    {entry.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 tabular-nums",
                        passed === trials.length
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {passed}/{trials.length} passed
                    </span>
                    {missing ? (
                      <span className="text-muted-foreground">
                        {missing} not recorded
                      </span>
                    ) : null}
                    <CaretRightIcon
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground"
                    />
                  </span>
                </Button>
              );
            })
          )}
        </div>
      )}
    </SetupSurface>
  );
}
