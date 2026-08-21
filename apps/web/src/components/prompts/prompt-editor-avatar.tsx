import type { Author } from "@anpord/schema/domain/prompts";
import { initials } from "@anpord/ui/lib/initials";
import { IdentityAvatar } from "@/components/dashboard/sidebar-identity";

/**
 * Who last edited a prompt, or a held slot where nobody has.
 *
 * A prompt written only through the API has no person to name, and leaving the
 * space empty read as a rendering fault rather than as an answer. The dashed
 * ring says the same thing the empty gap was trying to: this one is nobody's.
 */
export function PromptEditorAvatar({
  author,
}: {
  readonly author: Author | null;
}) {
  if (author === null) {
    return (
      <span
        aria-label="No editor"
        className="size-5 shrink-0 rounded-full border border-border-faint border-dashed"
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
