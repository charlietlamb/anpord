import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@sphynx/ui/components/avatar";
import { cn } from "@sphynx/ui/lib/utils";

interface IdentityAvatarProps {
  className?: string;
  fallbackClassName?: string;
  image?: string | null;
  label: string;
  text: string;
}

export function IdentityAvatar({
  label,
  text,
  image,
  className,
  fallbackClassName,
}: IdentityAvatarProps) {
  return (
    <Avatar className={cn("rounded-md after:rounded-md", className)}>
      {image ? (
        <AvatarImage alt={label} className="rounded-md" src={image} />
      ) : null}
      <AvatarFallback className={cn("rounded-md text-xs", fallbackClassName)}>
        {text}
      </AvatarFallback>
    </Avatar>
  );
}
