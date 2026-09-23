export function TagChip({ tag }: { readonly tag: string }) {
  return (
    <span className="rounded-[3px] bg-alpha-4 px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {tag}
    </span>
  );
}
