interface PlacementsEmptyProps {
  readonly search: string;
}

/** An organisation with no prompts and a search that matched none look the
 * same on screen but mean opposite things, so they are never phrased alike. */
export function PlacementsEmpty({ search }: PlacementsEmptyProps) {
  const searching = search !== "";

  return (
    <div className="rounded-xl border border-border-surface border-dashed px-6 py-14 text-center">
      <p className="font-heading text-base tracking-tight">
        {searching ? "No matching prompts" : "No prompts yet"}
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        {searching
          ? `Nothing matches "${search}".`
          : "Create one to start versioning what your application sends."}
      </p>
    </div>
  );
}
