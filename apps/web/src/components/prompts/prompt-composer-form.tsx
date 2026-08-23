import { extractVariables } from "@anpord/template/extract";
import {
  ComposerContext,
  ComposerToolbar,
  ComposerToolbarGroup,
} from "@anpord/ui/components/composer";
import { ToolbarButton } from "@anpord/ui/components/toolbar-button";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import type { Icon } from "@phosphor-icons/react";
import { BracketsCurlyIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { PromptComposer } from "@/components/prompts/prompt-composer";

interface PromptComposerFormProps {
  readonly children?: ReactNode;
  readonly content: string;
  readonly onContentChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly saving: boolean;

  readonly submitIcon: Icon;

  readonly submitLabel: string;
}

export function PromptComposerForm({
  children,
  content,
  onContentChange,
  onSubmit,
  saving,
  submitIcon: SubmitIcon,
  submitLabel,
}: PromptComposerFormProps) {
  const variables = extractVariables(content);
  const canSubmit = content.trim().length > 0 && !saving;

  return (
    <div className="flex w-full flex-col">
      {children ? <ComposerContext>{children}</ComposerContext> : null}

      <PromptComposer
        bounded
        content={content}
        onContentChange={onContentChange}
      />

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
              <SubmitIcon size={15} />
            )}
            {submitLabel}
          </ShortcutButton>
        </ComposerToolbarGroup>
      </ComposerToolbar>
    </div>
  );
}
