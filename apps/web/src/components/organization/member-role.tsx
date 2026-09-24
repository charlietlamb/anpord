import { Badge } from "@anpord/ui/components/ui/badge";

export function MemberRole({ role }: { readonly role: string }) {
  return (
    <span>
      <Badge className="capitalize" size="xs">
        {role}
      </Badge>
    </span>
  );
}
