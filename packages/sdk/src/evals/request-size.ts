import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import {
  MAX_START_REQUEST_CHARACTERS,
  MEGABYTE,
} from "@anpord/schema/domain/eval-quota";

const megabytes = (bytes: number) => `${(bytes / MEGABYTE).toFixed(1)}MB`;

const sizeOf = (value: unknown) => JSON.stringify(value).length;

const fitting = (total: number, count: number) =>
  Math.max(
    1,
    Math.floor(MAX_START_REQUEST_CHARACTERS / Math.ceil(total / count))
  );

export const tooLargeToSubmit = (
  request: Pick<StartBatchRequest, "cases" | "suite" | "variants">
) => {
  const size = sizeOf(request);

  if (size <= MAX_START_REQUEST_CHARACTERS) {
    return null;
  }

  const cases = sizeOf(request.cases);
  const variants = sizeOf(request.variants);
  const over = `${request.suite.name} compiles to ${megabytes(size)}, over the ${megabytes(MAX_START_REQUEST_CHARACTERS)} a batch may submit.`;

  return variants > cases
    ? `${over} Its ${request.variants.length} variants each carry the mocks the suite declares, so give it at most ${fitting(variants, request.variants.length)}.`
    : `${over} Its ${request.cases.length} cases carry a bundled validator each, so split it into suites of at most ${fitting(cases, request.cases.length)}.`;
};
