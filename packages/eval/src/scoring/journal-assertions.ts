export interface RequestRecord {
  readonly method: string;
  readonly path: string;
}

export interface AssertionResult {
  readonly evidence: string;
  readonly passed: boolean;
  readonly text: string;
}

const describe = (request: RequestRecord) =>
  `${request.method} ${request.path}`;

const matches = (record: RequestRecord, wanted: RequestRecord) =>
  record.method === wanted.method && record.path === wanted.path;

/**
 * Assertions over what an agent did to a server, rather than over what it
 * left behind.
 *
 * A final state answers whether the right thing happened. These answer
 * whether it happened the right way, which is the half no screenshot and no
 * end-state check can see. Every company in the research writes some version
 * of these by hand over their own log format.
 */
export const didRequest = (
  journal: readonly RequestRecord[],
  wanted: RequestRecord
): AssertionResult => {
  const hits = journal.filter((record) => matches(record, wanted));

  return {
    evidence:
      hits.length === 0
        ? `no ${describe(wanted)} in ${journal.length} requests`
        : `${hits.length} matching`,
    passed: hits.length > 0,
    text: `requested ${describe(wanted)}`,
  };
};

/** The absence half, which is where over-action shows up. Reports what was
 * called rather than only that something was, because a failure naming the
 * offender saves reading a journal by hand. */
export const didNotRequest = (
  journal: readonly RequestRecord[],
  forbidden: readonly RequestRecord[]
): AssertionResult => {
  const offenders = journal.filter((record) =>
    forbidden.some((wanted) => matches(record, wanted))
  );

  return {
    evidence:
      offenders.length === 0
        ? "none of them were called"
        : `called ${offenders.map(describe).join(", ")}`,
    passed: offenders.length === 0,
    text: `avoided ${forbidden.map(describe).join(", ")}`,
  };
};

/**
 * How many times a request was made, when once is the answer.
 *
 * An agent that does not notice its click landed will click again. If the
 * application deduplicates, the final state is correct and nothing but the
 * journal records that it happened twice. This is the assertion that catches
 * a class of flakiness a pass rate never will.
 */
export const requestedExactly = (
  journal: readonly RequestRecord[],
  wanted: RequestRecord,
  times: number
): AssertionResult => {
  const hits = journal.filter((record) => matches(record, wanted)).length;

  return {
    evidence: `${hits} of them`,
    passed: hits === times,
    text: `requested ${describe(wanted)} exactly ${times} time(s)`,
  };
};

/** Ordering, for a task whose steps depend on each other. A currency set
 * after an order was placed leaves the right final setting and the wrong
 * order. */
export const requestedInOrder = (
  journal: readonly RequestRecord[],
  first: RequestRecord,
  second: RequestRecord
): AssertionResult => {
  const firstAt = journal.findIndex((record) => matches(record, first));
  const secondAt = journal.findIndex((record) => matches(record, second));

  const passed = firstAt !== -1 && secondAt !== -1 && firstAt < secondAt;

  return {
    evidence:
      firstAt === -1 || secondAt === -1
        ? "one of them never happened"
        : `at ${firstAt} then ${secondAt}`,
    passed,
    text: `${describe(first)} before ${describe(second)}`,
  };
};

/** Every assertion has to hold, and the report names the ones that did not.
 * Combined with AND rather than averaged, matching how WebArena composes its
 * evaluators: a task is not three-quarters done. */
export const allHold = (
  results: readonly AssertionResult[]
): AssertionResult => {
  const failures = results.filter((result) => !result.passed);

  return {
    evidence:
      failures.length === 0
        ? `${results.length} assertions held`
        : failures
            .map((failure) => `${failure.text}: ${failure.evidence}`)
            .join("; "),
    passed: failures.length === 0,
    text: "every assertion",
  };
};
