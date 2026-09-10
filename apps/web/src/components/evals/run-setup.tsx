import type { EvalCell } from "@anpord/schema/domain/evals";
import { CopyButton } from "@anpord/ui/components/copy-button";
import {
  CheckSquareIcon,
  GitBranchIcon,
  type Icon,
  TerminalWindowIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react";
import { TickedProse } from "@/components/evals/inline-code";
import { SetupSurface } from "@/components/evals/setup-surface";
import { sharedSetupOf } from "@/lib/evals/shared-setup";

function Pill({
  Icon: Glyph,
  label,
  value,
}: {
  readonly Icon: Icon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-xs">
      <Glyph
        aria-hidden="true"
        className="shrink-0 text-muted-foreground"
        size={12}
      />
      <span className="text-muted-foreground/70">{label}</span>
      <span className="break-all font-mono text-foreground/85">{value}</span>
    </span>
  );
}

export function RunSetup({ cells }: { readonly cells: readonly EvalCell[] }) {
  const shared = sharedSetupOf(cells);

  if (shared === null) {
    return null;
  }

  const pills = [
    shared.repoUrl === null
      ? null
      : {
          Icon: GitBranchIcon,
          label: "repo",
          value: `${shared.repoUrl}${shared.repoRef === null ? "" : `@${shared.repoRef}`}`,
        },
    shared.prepareName === null
      ? null
      : {
          Icon: TerminalWindowIcon,
          label: "prepare",
          value: shared.prepareName,
        },
    shared.verifyCommand === null
      ? null
      : {
          Icon: CheckSquareIcon,
          label: "verify",
          value: shared.verifyCommand,
        },
  ].filter((pill) => pill !== null);

  if (shared.prompt === null && pills.length === 0) {
    return null;
  }

  return (
    <SetupSurface
      contentClassName="flex flex-col gap-2"
      controls={
        shared.prompt === null ? undefined : (
          <CopyButton label="Copy prompt" size="inline" value={shared.prompt} />
        )
      }
      Icon={TextAlignLeftIcon}
      meta={shared.promptVaries ? "shared by every case" : undefined}
      title="Setup"
    >
      {shared.prompt === null ? null : (
        <p className="max-w-prose whitespace-pre-wrap text-pretty text-foreground/90 text-sm leading-7">
          <TickedProse text={shared.prompt} />
        </p>
      )}

      {pills.length === 0 ? null : (
        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map((pill) => (
            <Pill
              Icon={pill.Icon}
              key={pill.label}
              label={pill.label}
              value={pill.value}
            />
          ))}
        </div>
      )}
    </SetupSurface>
  );
}
