import { Button } from "@anpord/ui/components/button";
import { ComposerSurface } from "@anpord/ui/components/composer";
import { MarkdownEditor } from "@anpord/ui/components/editor/markdown-editor";
import { cn } from "@anpord/ui/lib/utils";

interface PromptComposerProps {
  readonly bounded?: boolean;
  readonly className?: string;
  readonly content: string;
  readonly onContentChange: (value: string) => void;
  readonly onEditRequest?: () => void;
  readonly readOnly?: boolean;
}

export function PromptComposer({
  bounded,
  className,
  content,
  onContentChange,
  onEditRequest,
  readOnly,
}: PromptComposerProps) {
  return (
    <ComposerSurface className={className}>
      {readOnly && onEditRequest ? (
        <Button
          aria-label="Edit from this version"
          className="absolute inset-0 z-10 h-auto cursor-text rounded-none hover:bg-transparent"
          onClick={onEditRequest}
          variant="ghost"
        />
      ) : null}

      <MarkdownEditor
        className={cn(
          "prompt-prose-wide text-[0.9375rem] leading-7",
          bounded && "max-h-[min(24rem,50vh)] overflow-y-auto"
        )}
        onChange={onContentChange}
        placeholder="Write your prompt… use {{variables}} for values filled in at runtime."
        readOnly={readOnly}
        value={content}
      />
    </ComposerSurface>
  );
}
