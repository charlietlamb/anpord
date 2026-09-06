const REASONS: Record<string, string> = {
  commandCount: "the agent ran no commands",
  exitCode: "no verifier decided this trial",
  fingerprint: "the sandbox produced nothing to identify the run by",
  stdout: "nothing was written to stdout",
};

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
