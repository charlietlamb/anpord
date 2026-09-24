import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { fileIcon } from "@/lib/evals/file-presentation";

export function ChangedFileRow({ path }: { readonly path: string }) {
  const Glyph = fileIcon(path);
  const name = path.slice(path.lastIndexOf("/") + 1);

  return (
    <li className="flex min-w-0">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              className="flex min-w-0 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              type="button"
            >
              <Glyph
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {name}
              </span>
            </button>
          }
        />
        <TooltipContent className="max-w-sm" side="left">
          <span className="break-all font-mono text-xs">{path}</span>
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
