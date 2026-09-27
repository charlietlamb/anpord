const CHIP =
  "hidden h-9 items-center gap-2 rounded-full bg-alpha-4 px-3.5 text-muted-foreground text-xs xl:flex";

export function StatChips() {
  return (
    <>
      <span className={CHIP}>
        GitHub
        <span className="text-foreground tabular-nums">2,184</span>
      </span>
      <span className={CHIP}>
        npm
        <span className="text-foreground tabular-nums">18.2k</span>
      </span>
    </>
  );
}
