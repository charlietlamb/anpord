import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import { BracketsCurlyIcon } from "@phosphor-icons/react";
import {
  harnessPresentation,
  sandboxPresentation,
} from "@/lib/evals/variant-presentation";

/* The env integration is no harness, so it names itself. */
export const integrationPresentation = (integration: CredentialIntegration) => {
  if (integration.id === "env") {
    return { Icon: BracketsCurlyIcon, label: integration.label };
  }

  return integration.category === "harness"
    ? harnessPresentation(integration.id)
    : sandboxPresentation(integration.id);
};
