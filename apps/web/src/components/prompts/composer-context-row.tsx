import { ComposerContext } from "@anpord/ui/components/composer";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface ComposerContextRowProps {
  readonly children?: ReactNode;
  /** Names the prompt, the way a file names its buffer. */
  readonly filename?: string;
  readonly version?: number;
}

/**
 * What is being edited, stated above the writing surface. Returns nothing when
 * there is no context to give, so the prompt starts at the top of the page
 * rather than under an empty row.
 */
export function ComposerContextRow({
  children,
  filename,
  version,
}: ComposerContextRowProps) {
  if (!(children || filename || version !== undefined)) {
    return null;
  }

  return (
    <ComposerContext>
      {children}
      {filename ? (
        <span className="truncate font-mono text-xs">{filename}</span>
      ) : null}
      {version === undefined ? null : (
        <>
          <span className="text-border-loud">/</span>
          <ToolbarButton menu>
            <ClockCounterClockwiseIcon />v{version}
          </ToolbarButton>
        </>
      )}
    </ComposerContext>
  );
}
