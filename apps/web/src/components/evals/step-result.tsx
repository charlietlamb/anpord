import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { stepFailed } from "@/lib/evals/conversation";
import { isInFlight } from "@/lib/evals/timeline-sections";

export function StepResult({ entry }: { readonly entry: EvalJournalEntry }) {
  if (entry._tag !== "command" && entry._tag !== "toolCall") {
    return null;
  }

  if (isInFlight(entry)) {
    return (
      <StatusBadge icon={CircleNotchIcon} size="xs" spin tone="pending">
        Running
      </StatusBadge>
    );
  }

  if (entry._tag === "toolCall") {
    return stepFailed(entry) ? (
      <StatusBadge icon={XCircleIcon} size="xs" tone="destructive">
        Failed
      </StatusBadge>
    ) : (
      <StatusBadge icon={CheckCircleIcon} size="xs" tone="positive">
        Done
      </StatusBadge>
    );
  }

  const code = entry.exitCode ?? 0;

  return (
    <StatusBadge
      icon={code === 0 ? CheckCircleIcon : XCircleIcon}
      size="xs"
      tone={code === 0 ? "positive" : "destructive"}
    >
      Exit {code}
    </StatusBadge>
  );
}
