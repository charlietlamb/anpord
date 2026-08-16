import type { Editor } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect } from "react";
import { cn } from "../../lib/utils";
import { PasteMarkdown } from "./paste-markdown";
import { Variable } from "./variable-node";

interface MarkdownEditorProps {
  readonly className?: string;
  readonly onChange: (markdown: string) => void;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly value: string;
}

/** setContent defaults to HTML, so every write states its type. */
const MARKDOWN = { contentType: "markdown" as const };

/**
 * Markdown in, markdown out. Headings and emphasis style as you type the way
 * Obsidian does, while variables stay atoms so the stored string is exactly
 * what the model receives.
 */
export function MarkdownEditor({
  className,
  onChange,
  placeholder,
  readOnly,
  value,
}: MarkdownEditorProps) {
  const editor = useEditor(
    {
      content: value,
      contentType: "markdown",
      editable: !readOnly,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Markdown,
        PasteMarkdown,
        Variable,
        /** Sets data-placeholder on the empty node, which the CSS renders. */
        Placeholder.configure({ placeholder: placeholder ?? "" }),
      ],
      immediatelyRender: false,
      onUpdate: ({ editor: instance }: { editor: Editor }) =>
        onChange(instance.getMarkdown()),
    },
    [placeholder]
  );

  /** Restoring a version replaces the value from outside the editor. */
  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    if (editor.getMarkdown().trim() !== value.trim()) {
      editor.commands.setContent(value, {
        emitUpdate: false,
        contentType: MARKDOWN.contentType,
      });
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  return (
    <EditorContent className={cn("prompt-prose", className)} editor={editor} />
  );
}
