import { initials } from "@anpord/ui/lib/initials";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";

interface SaveMarkerProps {
  /** Absent for versions written before authorship was recorded. */
  readonly author: {
    readonly image?: string | null;
    readonly name: string;
  } | null;
}

/** A face where one is known, the act itself where it is not. */
export function SaveMarker({ author }: SaveMarkerProps) {
  if (!author) {
    return (
      <ArrowUpIcon className="size-3 text-muted-foreground" weight="bold" />
    );
  }

  return (
    <IdentityAvatar
      className="size-5"
      fallbackClassName="text-[0.5rem]"
      image={author.image}
      label={author.name}
      text={initials(author.name)}
    />
  );
}
