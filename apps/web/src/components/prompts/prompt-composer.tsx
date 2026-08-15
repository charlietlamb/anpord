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
import type { Icon } from "@phosphor-icons/react";
import {
  BracketsCurlyIcon,
  ClockCounterClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useIsClient } from "@/lib/use-is-client";

/** currentColor is the fill here, so the caps need their own contrast. */
const CAP = "border-black/14 bg-black/14 text-black/60";

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
              className="ml-1 inline-flex h-8 items-center gap-2 rounded-lg bg-primary pr-2 pl-3 font-medium text-primary-foreground text-sm shadow-[inset_0_1px_0_oklch(1_0_0/18%),0_1px_2px_oklch(0_0_0/22%)] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
              disabled={!canSubmit}
              onClick={onSubmit}
              type="button"
            >
              {saving ? (
                <SpinnerGapIcon className="animate-spin" size={15} />
              ) : (
                <SubmitIcon size={15} weight="bold" />
              )}
              {submitLabel}
              {isClient ? (
                <span className="flex items-center gap-0.5">
                  <Kbd className={CAP}>{isMac() ? "⌘" : "Ctrl"}</Kbd>
                  <Kbd className={CAP}>↵</Kbd>
                </span>
              ) : null}
            </button>
          </ComposerToolbarGroup>
        </ComposerToolbar>
      </ComposerSurface>
    </div>
  );
}
