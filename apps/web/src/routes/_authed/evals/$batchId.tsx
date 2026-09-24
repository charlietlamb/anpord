import { createFileRoute } from "@tanstack/react-router";
import { redirectFromBatch } from "@/lib/evals/batch-redirect";

export const Route = createFileRoute("/_authed/evals/$batchId")({
  ssr: false,
  loader: ({ params }) => redirectFromBatch(params.batchId),
});
