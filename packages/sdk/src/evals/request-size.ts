import type { PublicStartEvalRequest } from "@anpord/schema/public/evals-api";

const MEGABYTE = 1024 * 1024;

/* The gateway refuses a body over about four megabytes with a bare 413, which
   says nothing about which part of the suite was too big. */
const LIMIT = 3.5 * MEGABYTE;

const megabytes = (bytes: number) => `${(bytes / MEGABYTE).toFixed(1)}MB`;

const sizeOf = (value: unknown) => JSON.stringify(value).length;

const fitting = (total: number, count: number) =>
  Math.max(1, Math.floor(LIMIT / Math.ceil(total / count)));

/* Weight comes from bundled code, and it sits in two places: a validator per
   case, and the mocks a task carries for its harness. Splitting the wrong one
   does not help, so the advice follows whichever is larger. */
export const tooLargeToSubmit = (request: PublicStartEvalRequest) => {
  const size = sizeOf(request);

  if (size <= LIMIT) {
    return null;
  }

  const cases = sizeOf(request.cases);
  const tasks = sizeOf(request.tasks);
  const over = `${request.name} compiles to ${megabytes(size)}, over the ${megabytes(LIMIT)} a run may submit.`;

  return tasks > cases
    ? `${over} Its ${request.tasks.length} tasks each carry the mocks the suite declares, so give it at most ${fitting(tasks, request.tasks.length)}.`
    : `${over} Its ${request.cases.length} cases carry a bundled validator each, so split it into suites of at most ${fitting(cases, request.cases.length)}.`;
};
