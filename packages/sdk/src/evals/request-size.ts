import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";

const MEGABYTE = 1024 * 1024;

const LIMIT = 3.5 * MEGABYTE;

const megabytes = (bytes: number) => `${(bytes / MEGABYTE).toFixed(1)}MB`;

const sizeOf = (value: unknown) => JSON.stringify(value).length;

const fitting = (total: number, count: number) =>
  Math.max(1, Math.floor(LIMIT / Math.ceil(total / count)));

export const tooLargeToSubmit = (
  request: Pick<StartBatchRequest, "cases" | "suite" | "variants">
) => {
  const size = sizeOf(request);

  if (size <= LIMIT) {
    return null;
  }

  const cases = sizeOf(request.cases);
  const variants = sizeOf(request.variants);
  const over = `${request.suite.name} compiles to ${megabytes(size)}, over the ${megabytes(LIMIT)} a batch may submit.`;

  return variants > cases
    ? `${over} Its ${request.variants.length} variants each carry the mocks the suite declares, so give it at most ${fitting(variants, request.variants.length)}.`
    : `${over} Its ${request.cases.length} cases carry a bundled validator each, so split it into suites of at most ${fitting(cases, request.cases.length)}.`;
};
