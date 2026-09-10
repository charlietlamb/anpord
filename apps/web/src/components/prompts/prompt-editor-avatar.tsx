import type { Author } from "@anpord/schema/domain/prompts";
import { initials } from "@anpord/ui/lib/initials";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";

export function PromptEditorAvatar({
  author,
}: {
  readonly author: Author | null;
}) {
  if (author === null) {
    return (
      <span
        aria-label="No editor"
        className="size-5 shrink-0 rounded-full border border-border-faint"
        role="img"
      />
    );
  }

  return (
    <IdentityAvatar
      className="size-5 shrink-0 rounded-full after:rounded-full"
      fallbackClassName="rounded-full text-[0.5rem]"
      image={author.image}
      label={author.name}
      text={initials(author.name)}
    />
  );
}
