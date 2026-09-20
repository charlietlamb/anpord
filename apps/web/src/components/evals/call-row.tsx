import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { cn } from "@anpord/ui/lib/utils";
import {
  CaretRightIcon,
  TerminalWindowIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { commandText } from "@/lib/evals/journal-presentation";

export type Call = Extract<EvalJournalEntry, { _tag: "command" | "toolCall" }>;

export const didFail = (call: Call) =>
  call._tag === "command"
    ? call.exitCode !== null && call.exitCode !== 0
    : call.error !== undefined ||
      call.status === "failed" ||
      call.status === "error";

/* A tool arrives as `server.tool`. The server repeats down the whole list, so
   it recedes and the tool -- the one part that differs row to row -- carries
   the weight the eye is scanning for. */
function CallName({ name }: { readonly name: string }) {
  const split = name.lastIndexOf(".");

  if (split <= 0) {
    return <span className="text-foreground">{name}</span>;
  }

  return (
    <>
      <span className="text-muted-foreground">{name.slice(0, split + 1)}</span>
      <span className="font-medium text-foreground">
        {name.slice(split + 1)}
      </span>
    </>
  );
}

export function CallRow({
  call,
  children,
  onSelect,
  ordinal,
  selected,
}: {
  readonly call: Call;
  readonly children?: ReactNode;
  readonly onSelect: () => void;
  readonly ordinal: number;
  readonly selected: boolean;
}) {
  const command = call._tag === "command";
  const failed = didFail(call);
  const Glyph = command ? TerminalWindowIcon : WrenchIcon;

  return (
    <li>
      <button
        aria-pressed={selected}
        className={cn(
          "group/call flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left transition-colors",
          selected ? "bg-alpha-8" : "hover:bg-alpha-4"
        )}
        onClick={onSelect}
        type="button"
      >
        <span className="w-4 shrink-0 text-right text-[11px] text-muted-foreground/60 tabular-nums">
          {ordinal}
        </span>

        <Glyph
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            failed ? "text-warning" : "text-muted-foreground"
          )}
        />

        <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
          {command ? (
            <ShellText command={commandText(call.command)} />
          ) : (
            <CallName name={call.name} />
          )}
        </span>

        {failed ? (
          <span className="shrink-0 rounded-[2px] bg-warning/15 px-1.5 py-0.5 font-medium text-[10px] text-warning tabular-nums">
            {command ? `exit ${call.exitCode}` : (call.status ?? "failed")}
          </span>
        ) : null}

        <CaretRightIcon
          aria-hidden="true"
          className={cn(
            "size-3 shrink-0 text-muted-foreground/50 transition-transform",
            selected && "rotate-90"
          )}
        />
      </button>

      {children}
    </li>
  );
}
