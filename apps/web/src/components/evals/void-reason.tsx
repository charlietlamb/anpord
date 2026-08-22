const REASONS: Record<string, string> = {
  commandCount: "the agent ran no commands",
  exitCode: "no verifier decided this trial",
  fingerprint: "the sandbox produced nothing to identify the run by",
  stdout: "nothing was written to stdout",
};

/**
 * Why a trial produced no evidence.
 *
 * A sentence rather than `["stdout"]`, because `void` on its own tells nobody
 * what to fix, and the field names are ours rather than the reader's.
 */
export function VoidReason({ fields }: { readonly fields: readonly string[] }) {
  if (fields.length === 0) {
    return null;
  }

  const said = fields.map((field) => REASONS[field] ?? field).join(", and ");

  return (
    <p className="text-muted-foreground text-xs">
      void: {said}, so no evidence was produced
    </p>
  );
}
