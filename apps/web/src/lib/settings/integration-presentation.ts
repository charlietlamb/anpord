import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import { BracketsCurlyIcon, BrainIcon } from "@phosphor-icons/react";
import {
  harnessPresentation,
  sandboxPresentation,
  VENDOR_MARKS,
} from "@/lib/evals/variant-presentation";

export const integrationPresentation = (integration: CredentialIntegration) => {
  if (integration.id === "env") {
    return { Icon: BracketsCurlyIcon, label: integration.label };
  }

  if (integration.category === "model") {
    return {
      Icon: VENDOR_MARKS[integration.id] ?? BrainIcon,
      label: integration.label,
    };
  }

  return integration.category === "harness"
    ? harnessPresentation(integration.id)
    : sandboxPresentation(integration.id);
};
