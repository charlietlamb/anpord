import type { CredentialIntegration } from "@anpord/schema/domain/credentials";
import {
  harnessPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/** The mark and name for a credential's integration, read from the category
 * the integration declares rather than from a list of ids kept elsewhere. */
export const integrationPresentation = (integration: CredentialIntegration) =>
  integration.category === "harness"
    ? harnessPresentation(integration.id)
    : providerPresentation(integration.id);
