// biome-ignore lint/correctness/noUnresolvedImports: biome cannot see the Suspense export in the react types
import { lazy, Suspense } from "react";

const RunTailListener = lazy(async () => ({
  default: (await import("@/components/evals/run-tail-listener"))
    .RunTailListener,
}));

const BatchTailListener = lazy(async () => ({
  default: (await import("@/components/evals/batch-tail-listener"))
    .BatchTailListener,
}));

export function LiveTail({
  batchId,
  runId,
}: {
  readonly batchId: string;
  readonly runId: string | null;
}) {
  return (
    <Suspense fallback={null}>
      {runId === null ? (
        <BatchTailListener batchId={batchId} />
      ) : (
        <RunTailListener batchId={batchId} runId={runId} />
      )}
    </Suspense>
  );
}
