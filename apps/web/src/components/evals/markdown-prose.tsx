import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import { cn } from "@anpord/ui/lib/utils";
import { isValidElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/* A fenced block reaches pre as a code element wrapping its text, so the
   string to copy is read back rather than tracked alongside. */
const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }

  return "";
};

const unwrapped = (node: ReactNode): ReactNode =>
  isValidElement<{ children?: ReactNode }>(node) ? node.props.children : node;

/* Code renders through the same components as the rest of the interface, so a
   snippet inside a judge's answer looks like one anywhere else. Everything
   markdown adds beyond that is styled here. */
const COMPONENTS: Components = {
  code: ({ children }) => <InlineCode>{children}</InlineCode>,
  /* A fence arrives wrapped in its own code element. CodeBlock is already the
     pre, so the wrapper is unwrapped rather than nested inside it. */
  pre: ({ children }) => (
    <CodeBlock copyValue={textOf(children)}>{unwrapped(children)}</CodeBlock>
  ),
};

export function MarkdownProse({
  text,
  className,
}: {
  readonly text: string;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed [overflow-wrap:anywhere]",
        "[&_li>p]:my-1 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold",
        "[&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:border-border-faint",
        "[&_table]:w-full [&_table]:text-left [&_td]:border-border-faint [&_td]:border-b [&_td]:p-2 [&_th]:border-border-faint [&_th]:border-b [&_th]:p-2",
        className
      )}
    >
      <Markdown components={COMPONENTS} remarkPlugins={[remarkGfm]}>
        {text}
      </Markdown>
    </div>
  );
}
