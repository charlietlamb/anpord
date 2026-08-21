import { Button } from "@anpord/ui/components/button";
import { ComposerSurface } from "@anpord/ui/components/composer";
import { MarkdownEditor } from "@anpord/ui/components/editor/markdown-editor";
import { cn } from "@anpord/ui/lib/utils";

interface PromptComposerProps {
  /** Caps the height and scrolls inside itself, for the pages where the
   * composer is one element among several rather than the pane's subject. */
  readonly bounded?: boolean;
  readonly className?: string;
  readonly content: string;
  readonly onContentChange: (value: string) => void;
  /** Called when someone tries to write into content that is read-only. */
  readonly onEditRequest?: () => void;
  readonly readOnly?: boolean;
}

/**
 * The writing surface. It draws nothing of its own: the prompt is the page's
 * subject, and a frame around the thing you came to read only competes with it.
 */
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

      {/* Grows with what is written. Where the pane around it scrolls, the
          prompt reads as one document rather than a window onto one. */}
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
