import { DropdownMenuItem } from "@anpord/ui/components/dropdown-menu";
import { useCopy } from "@anpord/ui/hooks/use-copy";
import {
  ArrowSquareOutIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";

export function PromptRowActions({ id }: { readonly id: string }) {
  const { copied: copiedId, copy: copyId } = useCopy(1000);
  const { copied: copiedUrl, copy: copyUrl } = useCopy(1000);

  return (
    <RowActionsMenu label={`Actions for ${id}`}>
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
    </RowActionsMenu>
  );
}
