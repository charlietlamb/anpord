import type { StartBatchRequest } from "@sphynx/schema/domain/eval-definition";
import type { EvalHarness } from "@sphynx/schema/domain/eval-trial";

type Case = StartBatchRequest["cases"][number];

export const userHarness = ({ user }: Case): readonly EvalHarness[] =>
  user?.kind === "simulated" && user.harness !== undefined
    ? [user.harness]
    : [];

const judgeHarnesses = ({ validator }: Case): readonly EvalHarness[] =>
  validator != null && "judges" in validator
    ? validator.judges.flatMap((judge) =>
        judge.harness === undefined ? [] : [judge.harness]
      )
    : [];

export const harnessesNeeded = (
  request: StartBatchRequest
): readonly EvalHarness[] => [
  ...new Set([
    ...request.variants.map((variant) => variant.harness),
    ...request.cases.flatMap(userHarness),
    ...request.cases.flatMap(judgeHarnesses),
  ]),
];
