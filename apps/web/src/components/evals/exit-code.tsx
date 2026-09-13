export function ExitCode({ code }: { readonly code: number | null }) {
  if (code === null || code === 0) {
    return null;
  }

  return (
    <span className="w-fit shrink-0 rounded bg-warning/20 px-1.5 py-0.5 font-medium text-warning text-xs tabular-nums">
      exit {code}
    </span>
  );
}
