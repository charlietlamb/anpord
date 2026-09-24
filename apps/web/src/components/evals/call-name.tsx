export function CallName({ name }: { readonly name: string }) {
  const split = name.lastIndexOf(".");

  if (split <= 0) {
    return <span className="text-foreground">{name}</span>;
  }

  return (
    <>
      <span className="text-muted-foreground">{name.slice(0, split + 1)}</span>
      <span className="font-medium text-foreground">
        {name.slice(split + 1)}
      </span>
    </>
  );
}
