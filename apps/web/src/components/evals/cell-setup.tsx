import type { EvalSetup } from "@anpord/schema/domain/evals";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";
import { cn } from "@anpord/ui/lib/utils";
import {
  CaretRightIcon,
  CheckSquareIcon,
  FolderOpenIcon,
  GitBranchIcon,
  type Icon,
  TerminalWindowIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";

/**
 * What the agent was asked and what decided whether it succeeded.
 *
 * Collapsed by default: a reader arrives to see how a cell scored, and the
 * prompt is what they open when the score surprises them. Present rather than
 * absent, because a verdict whose rubric lives only in the database is a claim
 * the screen is asking to be trusted on.
 */
function Block({
  children,
  defaultOpen = false,
  Icon: Glyph,
  meta,
  title,
}: {
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly Icon: Icon;
  readonly meta?: string;
  readonly title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col">
      <button
        className="flex h-7 items-center gap-1.5 rounded-sm text-left text-muted-foreground text-xs transition-colors duration-150 ease-out hover:text-foreground"
        onClick={() => setOpen((was) => !was)}
        type="button"
      >
        <CaretRightIcon
          aria-hidden="true"
          className={cn(
            "shrink-0 transition-transform duration-150 ease-out",
            open && "rotate-90"
          )}
          size={12}
        />
        <Glyph aria-hidden="true" className="shrink-0" size={13} />
        {title}
        {meta === undefined ? null : (
          <span className="text-muted-foreground/70 tabular-nums">{meta}</span>
        )}
      </button>

      {open ? <div className="mt-1 mb-1">{children}</div> : null}
    </div>
  );
}

const lines = (value: string) => {
  const count = value.trimEnd().split("\n").length;

  return `${count} line${count === 1 ? "" : "s"}`;
};

export function CellSetup({ setup }: { readonly setup: EvalSetup }) {
  return (
    <div className="flex flex-col">
      <Block Icon={TextAlignLeftIcon} meta={lines(setup.prompt)} title="Prompt">
        {/* Prose, not code: the prompt is what a person wrote, and setting
            it in mono would claim the agent was handed a script. */}
        <div className="group relative">
          <p className="whitespace-pre-wrap text-pretty rounded-md bg-muted/50 px-3 py-2.5 pr-11 text-xs leading-relaxed">
            {setup.prompt}
          </p>
          <CopyButton
            className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover:opacity-100"
            label="Copy prompt"
            value={setup.prompt}
          />
        </div>
      </Block>

      {setup.setupCommand === null ? null : (
        <Block
          Icon={TerminalWindowIcon}
          meta={lines(setup.setupCommand)}
          title="Setup"
        >
          <ShellBlock className="max-h-80" command={setup.setupCommand} />
        </Block>
      )}

      {/* Absent means nothing checked the work, which is worth saying rather
          than leaving the reader to assume a check they cannot see. */}
      {setup.verifyCommand === null ? (
        <p className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs">
          <CheckSquareIcon aria-hidden="true" className="shrink-0" size={13} />
          No verify script, so trials are void rather than passed.
        </p>
      ) : (
        <Block
          Icon={CheckSquareIcon}
          meta={lines(setup.verifyCommand)}
          title="Verify"
        >
          <ShellBlock className="max-h-80" command={setup.verifyCommand} />
        </Block>
      )}

      <p className="flex h-7 items-center gap-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <FolderOpenIcon aria-hidden="true" className="shrink-0" size={13} />
          <span className="font-mono">{setup.workspace}</span>
        </span>

        {setup.repoUrl === null ? null : (
          <span className="flex min-w-0 items-center gap-1.5">
            <GitBranchIcon aria-hidden="true" className="shrink-0" size={13} />
            <span className="truncate font-mono">
              {setup.repoUrl}
              {setup.repoRef === null ? "" : `@${setup.repoRef}`}
            </span>
          </span>
        )}
      </p>
    </div>
  );
}
