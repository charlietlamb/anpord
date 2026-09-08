import { cn } from "@anpord/ui/lib/utils";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        "[&_code]:rounded [&_code]:border [&_code]:border-border-faint [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border-faint [&_pre]:bg-muted/30 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-[1.7] [&_pre]:[font-variation-settings:'wght'_450]",
        "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-border [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:border-border-faint",
        "[&_table]:w-full [&_table]:text-left [&_td]:border-border-faint [&_td]:border-b [&_td]:p-2 [&_th]:border-border-faint [&_th]:border-b [&_th]:p-2",
        className
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
