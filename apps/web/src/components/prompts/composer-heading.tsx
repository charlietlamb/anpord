import { useCurrentUser } from "@/lib/use-current-user";
import { useIsClient } from "@/lib/use-is-client";

const WHITESPACE = /\s+/;

/** Only the given name; a full name reads as a form field rather than a greeting. */
const firstName = (name: string) => name.trim().split(WHITESPACE)[0];

interface ComposerHeadingProps {
  /** Absent when creating, so the heading greets instead of naming the prompt. */
  readonly promptName?: string;
}

export function ComposerHeading({ promptName }: ComposerHeadingProps) {
  const user = useCurrentUser();
  const isClient = useIsClient();

  const greeting =
    isClient && user
      ? `What are you creating today, ${firstName(user.name)}?`
      : "What are you creating today?";

  return (
    <h1 className="fade-in-0 slide-in-from-bottom-1 mb-4 animate-in text-balance px-4 font-heading text-2xl tracking-tight ease-out [animation-duration:400ms]">
      {promptName ? `Editing ${promptName}` : greeting}
    </h1>
  );
}
