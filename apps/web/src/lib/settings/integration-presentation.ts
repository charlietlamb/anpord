import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import { BracketsCurlyIcon } from "@phosphor-icons/react";
import {
  harnessPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/** The mark and name for a credential's integration, read from the category
 * the integration declares rather than from a list of ids kept elsewhere.
 * The env integration is no harness, so it names itself. */
export const integrationPresentation = (integration: CredentialIntegration) => {
  if (integration.id === "env") {
    return { Icon: BracketsCurlyIcon, label: integration.label };
  }

  return integration.category === "harness"
    ? harnessPresentation(integration.id)
    : providerPresentation(integration.id);
};
