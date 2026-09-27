// biome-ignore lint/correctness/noUnresolvedImports: biome cannot see the Suspense export in the react types
import { type ComponentType, lazy, Suspense } from "react";

const withoutTail = { default: () => null };

const RunTailListener = lazy<
  ComponentType<{ readonly batchId: string; readonly runId: string }>
>(() =>
  import("@/components/evals/run-tail-listener").then(
    (module) => ({ default: module.RunTailListener }),
    () => withoutTail
  )
);

const BatchTailListener = lazy<ComponentType<{ readonly batchId: string }>>(
  () =>
    import("@/components/evals/batch-tail-listener").then(
      (module) => ({ default: module.BatchTailListener }),
      () => withoutTail
    )
);

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
