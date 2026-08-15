import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@anpord/ui/components/avatar";
import { cn } from "@anpord/ui/lib/utils";

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

interface IdentityLabelProps {
  className?: string;
  subtitle?: string;
  title: string;
}

export function IdentityLabel({
  title,
  subtitle,
  className,
}: IdentityLabelProps) {
  return (
    <div className={cn("grid flex-1 text-left leading-tight", className)}>
      <span className="truncate font-medium text-sm">{title}</span>
      {subtitle ? (
        <span className="truncate text-muted-foreground text-xs">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
