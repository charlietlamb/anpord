import {
  ComposerContext,
  ComposerSurface,
  ComposerToolbar,
  ComposerToolbarGroup,
} from "@anpord/ui/components/composer";
import { MarkdownEditor } from "@anpord/ui/components/editor/markdown-editor";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { extractVariables } from "@anpord/ui/lib/prompt-variables";
import type { Icon } from "@phosphor-icons/react";
import {
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
  readonly readOnly?: boolean;
  readonly saving: boolean;
  /** Paired with the label, since creating and versioning are different acts. */
  readonly submitIcon: Icon;
  /** Names the write, which differs between creating and versioning. */
  readonly submitLabel: string;
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
  submitIcon: SubmitIcon,
  submitLabel,
  version,
}: PromptComposerProps) {
  const variables = extractVariables(content);
  const canSubmit = content.trim().length > 0 && !(saving || readOnly);

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
        <MarkdownEditor
          className="max-h-[min(24rem,50vh)] overflow-y-auto px-4 pt-4 pb-2 text-[0.9375rem] leading-7"
          onChange={onContentChange}
          placeholder="Write your prompt… use {{variables}} for values filled in at runtime."
          readOnly={readOnly}
          value={content}
        />

        <ComposerToolbar>
          {/* Silent until there is something to count; an inert button
              announcing its own emptiness is chrome, not information. */}
          <ComposerToolbarGroup>
            {variables.length > 0 ? (
              <ToolbarButton>
                <BracketsCurlyIcon />
                {variables.length} variable{variables.length > 1 ? "s" : ""}
              </ToolbarButton>
            ) : null}
          </ComposerToolbarGroup>

          <ComposerToolbarGroup className="ml-auto">
            <ShortcutButton
              className="ml-1 h-8"
              disabled={!canSubmit}
              metaShortcut="enter"
              onClick={onSubmit}
              size="sm"
            >
              {saving ? (
                <SpinnerGapIcon className="animate-spin" size={15} />
              ) : (
                <SubmitIcon size={15} weight="bold" />
              )}
              {submitLabel}
            </ShortcutButton>
          </ComposerToolbarGroup>
        </ComposerToolbar>
      </ComposerSurface>
    </div>
  );
}
