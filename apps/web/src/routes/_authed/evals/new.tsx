import { createFileRoute } from "@tanstack/react-router";
import { AgentSetup } from "@/components/evals/agent-setup";
import { PageShell } from "@/components/layout/page-shell";

export const Route = createFileRoute("/_authed/evals/new")({
  component: NewEvalScreen,
  staticData: { title: "New eval" },
});

function NewEvalScreen() {
  return (
    <PageShell
      description="Install the SDK, then give the prompt to your coding agent. It covers the API, the rules that make a result meaningful, and where the docs are."
      title="New eval"
      width="wide"
    >
      <AgentSetup />
    </PageShell>
  );
}
