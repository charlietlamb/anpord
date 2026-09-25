import { createFileRoute } from "@tanstack/react-router";
import { BatchScreen } from "@/components/evals/batch-screen";

export const Route = createFileRoute("/_authed/evals/$batchId")({
  ssr: false,
  component: BatchRoute,
});

function BatchRoute() {
  const { batchId } = Route.useParams();

  return <BatchScreen batchId={batchId} />;
}
