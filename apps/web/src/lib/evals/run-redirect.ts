import { redirect } from "@tanstack/react-router";
import { listRunAddresses } from "@/lib/evals/evals-client";

export const redirectFromRun = async (
  runId: string,
  within: { readonly cellKey?: string; readonly ordinal?: number } = {}
) => {
  const addresses = await listRunAddresses(runId, within);
  const cases = [...new Set(addresses.map((address) => address.caseId))];
  const [only] = addresses;

  if (within.ordinal !== undefined && only !== undefined) {
    throw redirect({
      params: { caseId: only.caseId, trialId: only.trialId },
      replace: true,
      to: "/evals/cases/$caseId/trials/$trialId",
    });
  }

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
