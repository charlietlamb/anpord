import {
  ComposerContext,
  ComposerSurface,
  ComposerToolbar,
  ComposerToolbarGroup,
} from "@anpord/ui/components/composer";
import { PromptEditor } from "@anpord/ui/components/prompt-editor";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { extractVariables } from "@anpord/ui/lib/prompt-variables";
import {
  ArrowUpIcon,
  BracketsCurlyIcon,
  ClockCounterClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface PromptComposerProps {
  readonly children?: ReactNode;
  readonly content: string;
  readonly onContentChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly saving: boolean;
  readonly version?: number;
}

/**
 * The editing surface: identity above, prompt body in the middle, and the
 * controls that act on it inside the same ring so it reads as one object.
 */
export function PromptComposer({
  children,
  content,
  onContentChange,
  onSubmit,
  saving,
  version,
}: PromptComposerProps) {
  const variables = extractVariables(content);
  const canSubmit = content.trim().length > 0 && !saving;

  return (
    <div className="w-full">
      <ComposerContext>
        {children}
        {version === undefined ? null : (
          <>
            <span className="text-border">/</span>
            <ToolbarButton menu>
              <ClockCounterClockwiseIcon />v{version}
            </ToolbarButton>
          </>
        )}
      </ComposerContext>

      <ComposerSurface>
        <PromptEditor
          onChange={onContentChange}
          placeholder="Write your prompt… use {{variables}} for values filled in at runtime."
          value={content}
        />

        <ComposerToolbar>
          <ComposerToolbarGroup>
            <ToolbarButton disabled={variables.length === 0}>
              <BracketsCurlyIcon />
              {variables.length === 0
                ? "No variables"
                : `${variables.length} variable${variables.length > 1 ? "s" : ""}`}
            </ToolbarButton>
          </ComposerToolbarGroup>

          <ComposerToolbarGroup className="ml-auto">
            <button
              aria-label="Save version"
              className="ml-1 inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {saving ? (
                <SpinnerGapIcon className="animate-spin" size={16} />
              ) : (
                <ArrowUpIcon size={16} weight="bold" />
              )}
            </button>
          </ComposerToolbarGroup>
        </ComposerToolbar>
      </ComposerSurface>
    </div>
  );
}
