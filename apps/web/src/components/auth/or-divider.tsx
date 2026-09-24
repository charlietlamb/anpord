import { Separator } from "@anpord/ui/components/ui/separator";

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-muted-foreground text-xs">
      <Separator className="flex-1" />
      <span>or</span>
      <Separator className="flex-1" />
    </div>
  );
}
