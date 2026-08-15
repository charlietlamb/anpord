import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { initials } from "@anpord/ui/lib/initials";
import { cn } from "@anpord/ui/lib/utils";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";

interface UserAvatarProps {
  readonly className?: string;
  readonly user: { readonly image: string | null; readonly name: string };
}

/**
 * Anywhere a person appears in a dense row, the avatar carries the identity and
 * the name stays in a tooltip rather than competing with the row's content.
 */
export function UserAvatar({ className, user }: UserAvatarProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="shrink-0 rounded-md outline-none"
        render={
          <IdentityAvatar
            className={cn("size-5", className)}
            fallbackClassName="text-[0.5rem]"
            image={user.image}
            label={user.name}
            text={initials(user.name)}
          />
        }
      />
      <TooltipContent>{user.name}</TooltipContent>
    </Tooltip>
  );
}
