import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { IdentityAvatar } from "@/components/dashboard/identity-avatar";
import { IdentityLabel } from "@/components/dashboard/identity-label";
import type { CurrentUser } from "@/lib/use-current-user";

export function NavUserIdentity({ user }: { readonly user: CurrentUser }) {
  return (
    <>
      <IdentityAvatar
        className="size-7"
        image={user.image}
        label={user.name}
        text={user.initials}
      />
      <IdentityLabel
        className="group-data-[collapsible=icon]:hidden"
        subtitle={user.email}
        title={user.name}
      />
      <DotsThreeVerticalIcon className="ml-1 size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
    </>
  );
}
