import { createFileRoute } from "@tanstack/react-router";
import { AgentSetup } from "@/components/evals/agent-setup";
import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/_authed/evals/new")({
  component: NewEvalScreen,
  staticData: { title: "New eval" },
});

function NewEvalScreen() {
  return (
    <PageShell width="wide">
      <AgentSetup />
    </PageShell>
  );
}
