import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import { OpenAiMark } from "@anpord/ui/components/brand/provider-marks";
import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { BracketsCurlyIcon, GavelIcon } from "@phosphor-icons/react";
import {
  harnessPresentation,
  sandboxPresentation,
} from "@/lib/evals/variant-presentation";

/* TypeSafe ships no mark, so the category stands in for one rather than the
   generic fallback that reads as an unknown integration. */
const JUDGE_MARKS: Record<string, RailIcon> = { openai: OpenAiMark };

/* The env integration is no harness, so it names itself. */
export const integrationPresentation = (integration: CredentialIntegration) => {
  if (integration.id === "env") {
    return { Icon: BracketsCurlyIcon, label: integration.label };
  }

  if (integration.category === "judge") {
    return {
      Icon: JUDGE_MARKS[integration.id] ?? GavelIcon,
      label: integration.label,
    };
  }

  return integration.category === "harness"
    ? harnessPresentation(integration.id)
    : sandboxPresentation(integration.id);
};
