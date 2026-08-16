import { Button } from "@anpord/ui/components/button";
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
import { cn } from "@anpord/ui/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import {
  BracketsCurlyIcon,
  ClockCounterClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { CardHeader } from "@/components/prompts/card-header";

interface PromptComposerProps {
  readonly children?: ReactNode;
  readonly content: string;
  /** Names the prompt on the surface, the way a file names its buffer. */
  readonly filename?: string;
  /** Grows into the page instead of sitting at its own height. */
  readonly fill?: boolean;
  readonly onContentChange: (value: string) => void;
  /** Called when someone tries to write into content that is read-only. */
  readonly onEditRequest?: () => void;
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
  filename,
  fill,
  onContentChange,
  onEditRequest,
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
    <div className={cn("flex w-full flex-col", fill && "min-h-0")}>
      {/* With nothing to name, the strip is a bar of empty chrome above the
          prompt rather than context for it. */}
      {children || version !== undefined ? (
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
      ) : null}

      {/* Titled like the cards beside it, so it takes their surface too rather
          than sitting on the page as a different kind of object. `overflow-clip`
          rounds the header's top edge without establishing a scroll container,
          which the editor owns. */}
      <ComposerSurface
        className={cn(
          "relative",
          filename && "overflow-clip bg-sidebar-accent/50",
          fill && "min-h-0"
        )}
      >
        {readOnly && onEditRequest ? (
          <Button
            aria-label="Edit from this version"
            className="absolute inset-0 z-10 h-auto cursor-text rounded-none hover:bg-transparent"
            onClick={onEditRequest}
            variant="ghost"
          />
        ) : null}
        <CardHeader title={filename} />

        <MarkdownEditor
          className={cn(
            "overflow-y-auto overscroll-contain px-4 py-4 text-[0.9375rem] leading-7",
            /* Grows with the prompt rather than claiming the whole row: a short
               one keeps a few spare lines to write into, and the page height is
               the ceiling past which the editor scrolls instead. */
            fill
              ? "max-h-[calc(100svh-16rem)] min-h-[10rem]"
              : "max-h-[min(24rem,50vh)]"
          )}
          onChange={onContentChange}
          placeholder="Write your prompt… use {{variables}} for values filled in at runtime."
          readOnly={readOnly}
          value={content}
        />

        {/* On a full page the rail counts the variables and the header owns the
            write, so repeating either here would say the same thing twice. */}
        {fill ? null : (
          <ComposerToolbar>
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
        )}
      </ComposerSurface>
    </div>
  );
}
