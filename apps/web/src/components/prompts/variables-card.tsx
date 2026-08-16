import { Badge } from "@anpord/ui/components/ui/badge";
import { RailCard } from "@/components/prompts/rail-card";

interface VariablesCardProps {
  readonly variables: readonly string[];
}

export function VariablesCard({ variables }: VariablesCardProps) {
  if (variables.length === 0) {
    return null;
  }

  return (
    <RailCard className="flex flex-wrap gap-1.5" title="Variables">
      {variables.map((name) => (
        <Badge
          className="h-6 px-2.5 font-medium font-mono text-[0.6875rem]"
          key={name}
          variant="outline"
        >
          {name}
        </Badge>
      ))}
    </RailCard>
  );
}
