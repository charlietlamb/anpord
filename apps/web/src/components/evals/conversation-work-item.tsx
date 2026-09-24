import { ConversationStep } from "@/components/evals/conversation-step";
import { WroteLine } from "@/components/evals/wrote-line";
import type { ConversationStep as Step } from "@/lib/evals/conversation";

export function ConversationWorkItem({ step }: { readonly step: Step }) {
  if (step._tag !== "fileChange") {
    return <ConversationStep call={step} />;
  }

  return <WroteLine paths={step.paths} />;
}
