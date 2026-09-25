export function LivePip({ label }: { readonly label: string }) {
  return (
    <span className="flex items-center gap-2 text-muted-foreground text-xs">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      {label}
    </span>
  );
}
