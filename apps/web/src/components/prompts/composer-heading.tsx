import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { useCurrentUser } from "@/lib/use-current-user";
import { useIsClient } from "@/lib/use-is-client";

const WHITESPACE = /\s+/;

const firstName = (name: string) => name.trim().split(WHITESPACE)[0];

export function ComposerHeading() {
  const user = useCurrentUser();
  const isClient = useIsClient();

  const greeting =
    isClient && user
      ? `What are you creating today, ${firstName(user.name)}?`
      : "What are you creating today?";

  return (
    <h1 className="fade-in-0 slide-in-from-bottom-1 mb-5 flex animate-in ease-out [animation-duration:400ms]">
      <PageHeading title={greeting} />
    </h1>
  );
}
