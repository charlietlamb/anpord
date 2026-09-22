export function ExitCode({ code }: { readonly code: number | null }) {
  if (code === null || code === 0) {
    return null;
  }

  return (
    <span className="w-fit shrink-0 rounded-full bg-warning/15 px-2 py-0.5 font-medium font-sans text-[11px] text-warning tabular-nums">
      exit {code}
    </span>
  );
}
