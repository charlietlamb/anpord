import type { EvalArtifactMetadata } from "@anpord/schema/domain/evals";
import {
  Message,
  MessageContent,
} from "@anpord/ui/components/ai-elements/message";
import { ConversationWork } from "@/components/evals/conversation-work";
import {
  ConversationWrote,
  type TrialRef,
} from "@/components/evals/conversation-wrote";
import {
  type FileOpener,
  MarkdownProse,
} from "@/components/evals/markdown-prose";
import { MessageTook } from "@/components/evals/message-took";
import type { ConversationPart as Part } from "@/lib/evals/conversation";

export interface Written {
  readonly artifacts: readonly EvalArtifactMetadata[];
  readonly trial: TrialRef;
}

export function ConversationPart({
  live,
  openerFor,
  took,
  part,
  written,
}: {
  readonly live: boolean;
  readonly openerFor: FileOpener;
  readonly took: number | null;
  readonly part: Part;
  readonly written: Written;
}) {
  if (part._tag === "said") {
    return (
      <Message from="user">
        <MessageContent>{part.text}</MessageContent>
        <MessageTook ms={took} />
      </Message>
    );
  }

  if (part._tag === "replied") {
    return (
      <Message from="assistant">
        <MessageContent>
          <MarkdownProse openerFor={openerFor} text={part.text} />
        </MessageContent>
        <MessageTook ms={took} />
      </Message>
    );
  }

  if (part._tag === "wrote") {
    return <ConversationWrote paths={part.paths} {...written} />;
  }

  return <ConversationWork live={live} steps={part.steps} />;
}
