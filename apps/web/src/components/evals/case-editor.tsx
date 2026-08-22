import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { CaretRightIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

/**
 * One case, open or closed.
 *
 * Collapsed by default past the first, because a run of six cases is a list to
 * scan and a single case is a thing to write. The name stays visible either
 * way: it is what the grid will label this row, and a collapsed row that
 * cannot be told from its neighbour is a row nobody dares delete.
 */
export function CaseRow({
  children,
  defaultOpen,
  name,
  onRemove,
  removable,
  ungated,
}: {
  readonly children: React.ReactNode;
  readonly defaultOpen: boolean;
  readonly name: string;
  readonly onRemove: () => void;
  readonly removable: boolean;
  readonly ungated: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className="rounded-lg border border-border-faint">
      <div className="flex h-10 items-center gap-1 pr-1 pl-1">
        <button
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-alpha-4"
          onClick={() => setOpen((was) => !was)}
          type="button"
        >
          <CaretRightIcon
            aria-hidden="true"
            className={cn(
              "shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
              open && "rotate-90"
            )}
            size={12}
          />
          <span className="min-w-0 flex-1 truncate text-sm">
            {name === "" ? (
              <span className="text-muted-foreground">Untitled case</span>
            ) : (
              name
            )}
          </span>
          {ungated ? (
            <span className="shrink-0 text-warning text-xs">no verify</span>
          ) : null}
        </button>

        {removable ? (
          <Button
            aria-label={`Remove ${name === "" ? "this case" : name}`}
            onClick={onRemove}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="flex flex-col gap-4 border-border-faint border-t px-3 py-3">
          {children}
        </div>
      ) : null}
    </li>
  );
}

/** Adds a row to a list that is never empty: a run with no cases is not a
 * smaller run, it is not a run. */
export function AddCaseButton({ onAdd }: { readonly onAdd: () => void }) {
  return (
    <Button
      className="w-full justify-center"
      onClick={onAdd}
      size="sm"
      type="button"
      variant="outline"
    >
      <PlusIcon className="size-3.5" />
      Add case
    </Button>
  );
}
