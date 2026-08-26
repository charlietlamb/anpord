import { createFileRoute } from "@tanstack/react-router";
import { CredentialPage } from "@/components/settings/credential-page";
import { CONNECTION_SECTIONS } from "@/lib/settings/connection-sections";

const SPEC = CONNECTION_SECTIONS.find(
  (section) => section.category === "harness"
);

export const Route = createFileRoute("/_authed/settings/harnesses")({
  component: () => (SPEC === undefined ? null : <CredentialPage spec={SPEC} />),
  staticData: { title: "Harnesses" },
});
