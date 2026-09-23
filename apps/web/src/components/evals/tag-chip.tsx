import { Badge } from "@anpord/ui/components/ui/badge";

export function TagChip({ tag }: { readonly tag: string }) {
  return (
    <Badge className="text-muted-foreground" size="xs" variant="secondary">
      {tag}
    </Badge>
  );
}
