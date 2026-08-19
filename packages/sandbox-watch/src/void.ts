/**
 * A command that never ran produces output, and two runs that both failed the
 * same way produce the same output. A comparator reading those as agreement
 * reported a perfect replication across two empty sandboxes, which is how a
 * broken provider earns a 100% pass rate.
 *
 * So a field is void when it carries the shape of a failure to execute rather
 * than a result, and any void field poisons the run: checking that some field
 * looks real is not enough, because the run above had six of them.
 */
const VOID_PATTERNS = [
  /fork\/exec .*: no such file or directory/i,
  /^\s*$/,
  /command not found/i,
  /cannot execute binary file/i,
  /permission denied/i,
];

export const isVoidValue = (value: string) =>
  VOID_PATTERNS.some((pattern) => pattern.test(value));

export interface VoidCheck {
  readonly fields: readonly string[];
  readonly voided: boolean;
}

export const checkVoid = (
  fingerprint: Readonly<Record<string, string>>
): VoidCheck => {
  const fields = Object.entries(fingerprint)
    .filter(([, value]) => isVoidValue(String(value)))
    .map(([key]) => key);

  return { fields, voided: fields.length > 0 };
};
