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
import { ROW_ACTION } from "@/components/layout/row-action";

export function PromptRowActions({ id }: { readonly id: string }) {
  const { copied: copiedId, copy: copyId } = useCopy(1000);
  const { copied: copiedUrl, copy: copyUrl } = useCopy(1000);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${id}`}
            className={ROW_ACTION}
            size="icon-sm"
            variant="bare"
          />
        }
      >
        <DotsThreeIcon />
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
