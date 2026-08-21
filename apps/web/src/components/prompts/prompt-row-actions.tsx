import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  DotsThreeIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

/**
 * What can be done to a prompt without opening it.
 *
 * Held to what the API actually offers: there is no delete, and a menu that
 * lists one would be a promise the page cannot keep.
 */
export function PromptRowActions({ id }: { readonly id: string }) {
  const { copied: copiedId, copy: copyId } = useCopy(1000);
  const { copied: copiedUrl, copy: copyUrl } = useCopy(1000);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${id}`}
            className="size-6 shrink-0 rounded opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
            size="icon-sm"
            variant="bare"
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem render={<Link params={{ id }} to="/prompts/$id" />}>
          <ArrowSquareOutIcon />
          Open
        </DropdownMenuItem>

        <DropdownMenuItem closeOnClick={false} onClick={() => copyId(id)}>
          {copiedId ? <CheckIcon /> : <CopyIcon />}
          {copiedId ? "Copied" : "Copy ID"}
        </DropdownMenuItem>

        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => copyUrl(`${window.location.origin}/prompts/${id}`)}
        >
          {copiedUrl ? <CheckIcon /> : <LinkIcon />}
          {copiedUrl ? "Copied" : "Copy URL"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
