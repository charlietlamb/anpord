import { MAX_START_TRIALS } from "@anpord/schema/domain/eval-quota";
import {
  type RerunIntent,
  RerunScope,
  type RerunTarget,
} from "@anpord/schema/domain/eval-rerun";
import type { EvalSuite } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { BaseDialog } from "@anpord/ui/components/dialog/base-dialog";
import { DialogFooter } from "@anpord/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { counted } from "@anpord/ui/lib/evals/counted";
import { cn, SPIN } from "@anpord/ui/lib/utils";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RerunPreview } from "@/components/evals/rerun-preview";
import { RerunSuiteField } from "@/components/evals/rerun-suite-field";
import { RerunTargetField } from "@/components/evals/rerun-target-field";
import { useRerunSuite } from "@/lib/evals/eval-mutations";
import { evalQueries } from "@/lib/evals/eval-queries";
import { HttpError } from "@/lib/http-error";

export type RerunSubject =
  | { readonly kind: "fixed"; readonly suite: EvalSuite }
  | {
      readonly kind: "chosen";
      readonly suite: EvalSuite | null;
      readonly suites: readonly EvalSuite[];
    };

const SCOPE_COPY: Record<RerunScope, string> = {
  everyCase: "Every case",
  onlyFailures: "Only the ones that failed",
};

const TRIAL_CHOICES = Array.from(
  { length: MAX_START_TRIALS },
  (_, index) => index + 1
);

const OPENING: RerunIntent = {
  scope: "everyCase",
  target: { kind: "asBefore" },
  trials: 1,
};

const PLAN_CHANGED = 409;

const chosen = (target: RerunTarget) =>
  target.kind === "asBefore" || target.model !== "";

export function RerunDialog({
  onClose,
  open,
  subject,
}: {
  readonly onClose: () => void;
  readonly open: boolean;
  readonly subject: RerunSubject;
}) {
  const [suite, setSuite] = useState(subject.suite);
  const [intent, setIntent] = useState(OPENING);
  const [rechecking, setRechecking] = useState(false);
  const rerun = useRerunSuite(suite?.id ?? "");
  const plan = useQuery({
    ...evalQueries.rerunPlan(suite?.id ?? "", intent),
    enabled: suite !== null && chosen(intent.target),
  });

  const noticeOf = () => {
    if (suite === null) {
      return "Choose a suite to see what would run.";
    }
    if (!chosen(intent.target)) {
      return "Choose a model to see what would run.";
    }
    if (plan.error) {
      return plan.error.message;
    }
    return plan.data === undefined ? "Working out what would run." : null;
  };

  const notice = noticeOf();
  const ready = plan.data;

  const start = () => {
    if (ready === undefined) {
      return;
    }

    rerun.mutate(
      { ...intent, expect: ready.fingerprint },
      {
        onError: (error) => {
          toast.error("Couldn't start the re-run", {
            description: error.message,
          });

          if (error instanceof HttpError && error.status === PLAN_CHANGED) {
            setRechecking(true);
            plan.refetch().finally(() => setRechecking(false));
          }
        },
        onSuccess: () => {
          toast.success(
            `Started ${counted(ready.slots.length, "run", "runs")}`
          );
          onClose();
        },
      }
    );
  };

  return (
    <BaseDialog
      className="sm:max-w-2xl"
      description="Pick what to repeat and where it runs. Nothing starts until you say so."
      onClose={onClose}
      open={open}
      title="Run this suite again"
    >
      <div className="flex flex-wrap items-center gap-2">
        {subject.kind === "chosen" ? (
          <RerunSuiteField
            onSelect={setSuite}
            selected={suite}
            suites={subject.suites}
          />
        ) : null}

        <Select
          onValueChange={(scope) =>
            setIntent({ ...intent, scope: scope ?? intent.scope })
          }
          value={intent.scope}
        >
          <SelectTrigger
            aria-label="Which cases"
            className="max-w-56"
            size="sm"
          >
            <SelectValue>{SCOPE_COPY[intent.scope]}</SelectValue>
          </SelectTrigger>

          <SelectContent align="start" className="w-64">
            {RerunScope.literals.map((scope) => (
              <SelectItem className="pr-8" key={scope} value={scope}>
                {SCOPE_COPY[scope]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <RerunTargetField
          onChange={(target) => setIntent({ ...intent, target })}
          target={intent.target}
        />

        <Select
          onValueChange={(trials) =>
            setIntent({ ...intent, trials: trials ?? intent.trials })
          }
          value={intent.trials}
        >
          <SelectTrigger aria-label="Trials" className="max-w-40" size="sm">
            <SelectValue>
              {counted(intent.trials, "trial", "trials")}
            </SelectValue>
          </SelectTrigger>

          <SelectContent align="start">
            {TRIAL_CHOICES.map((trials) => (
              <SelectItem className="pr-8" key={trials} value={trials}>
                {counted(trials, "trial", "trials")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {notice === null && ready !== undefined ? (
        <RerunPreview plan={ready} />
      ) : (
        <p className="px-1 text-label text-muted-foreground">{notice}</p>
      )}

      <DialogFooter>
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button
          disabled={
            ready === undefined ||
            ready.slots.length === 0 ||
            rerun.isPending ||
            rechecking
          }
          onClick={start}
        >
          <ArrowsClockwiseIcon
            className={cn("size-3.5", rerun.isPending && SPIN)}
          />
          {rerun.isPending ? "Starting" : "Start"}
        </Button>
      </DialogFooter>
    </BaseDialog>
  );
}
