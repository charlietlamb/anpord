import {
  ComposerContext,
  ComposerSurface,
  ComposerToolbar,
  ComposerToolbarGroup,
} from "@anpord/ui/components/composer";
import { PromptEditor } from "@anpord/ui/components/prompt-editor";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { Kbd } from "@anpord/ui/components/ui/kbd";
import { isMac, useShortcut } from "@anpord/ui/hooks/use-shortcut";
import { extractVariables } from "@anpord/ui/lib/prompt-variables";
import {
  ArrowUpIcon,
  BracketsCurlyIcon,
  ClockCounterClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useIsClient } from "@/lib/use-is-client";

interface PromptComposerProps {
  readonly children?: ReactNode;
  readonly content: string;
  readonly onContentChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly readOnly?: boolean;
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
  readOnly,
  saving,
  version,
}: PromptComposerProps) {
  /** navigator is server-undefined, so the glyph resolves after mount. */
  const isClient = useIsClient();
  const variables = extractVariables(content);
  const canSubmit = content.trim().length > 0 && !(saving || readOnly);

  /** Saves from inside the editor, where the caret spends all its time. */
  useShortcut("enter", {
    disabled: !canSubmit,
    meta: true,
    onTrigger: onSubmit,
  });

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
          readOnly={readOnly}
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
              className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary pr-2 pl-2.5 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {saving ? (
                <SpinnerGapIcon className="animate-spin" size={16} />
              ) : (
                <ArrowUpIcon size={16} weight="bold" />
              )}
              {isClient ? (
                <span className="flex items-center gap-0.5">
                  <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd>↵</Kbd>
                </span>
              ) : null}
            </button>
          </ComposerToolbarGroup>
        </ComposerToolbar>
      </ComposerSurface>
    </div>
  );
}
