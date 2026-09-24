import { redirect } from "@tanstack/react-router";
import { getBatch } from "@/lib/evals/evals-client";

export const redirectFromBatch = async (batchId: string) => {
  const batch = await getBatch(batchId);
  const cases = [...new Set(batch.runs.map((run) => run.case.id))];
  const [caseId] = cases;

  if (cases.length === 1 && caseId !== undefined) {
    throw redirect({
      params: { caseId },
      replace: true,
      to: "/evals/cases/$caseId",
    });
  }

  throw redirect({ replace: true, to: "/evals" });
};
