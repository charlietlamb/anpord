import { Badge } from "@anpord/ui/components/ui/badge";
import { RailSection } from "@/components/rail/rail-section";

interface VariablesCardProps {
  readonly variables: readonly string[];
}

export function VariablesCard({ variables }: VariablesCardProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <RailSection className="flex flex-wrap gap-1.5" title="Variables">
      {variables.map((name) => (
        <Badge className="font-mono" key={name} size="sm" variant="outline">
          {name}
        </Badge>
      ))}
    </RailSection>
  );
}
