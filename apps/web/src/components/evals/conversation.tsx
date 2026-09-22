import type {
  EvalArtifactMetadata,
  EvalJournalEntry,
} from "@anpord/schema/domain/evals";
import {
  ConversationContent,
  ConversationEmptyState,
  Conversation as ConversationLog,
} from "@anpord/ui/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@anpord/ui/components/ai-elements/message";
import { ChatsCircleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { ConversationWork } from "@/components/evals/conversation-work";
import {
  ConversationWrote,
  type TrialRef,
} from "@/components/evals/conversation-wrote";
import { MarkdownProse } from "@/components/evals/markdown-prose";
import {
  type ConversationPart,
  conversationOf,
} from "@/lib/evals/conversation";
import { RISE } from "@/lib/motion";

interface Written {
  readonly artifacts: readonly EvalArtifactMetadata[];
  readonly trial: TrialRef;
}

function Part({
  live,
  part,
  written,
}: {
  readonly live: boolean;
  readonly part: ConversationPart;
  readonly written: Written;
}) {
  if (part._tag === "said") {
    return (
      <Message from="user">
        <MessageContent>{part.text}</MessageContent>
      </Message>
    );
  }

  if (part._tag === "replied") {
    return (
      <Message from="assistant">
        <MessageContent>
          <MarkdownProse text={part.text} />
        </MessageContent>
      </Message>
    );
  }

  if (part._tag === "wrote") {
    return <ConversationWrote paths={part.paths} {...written} />;
  }

  return <ConversationWork live={live} steps={part.steps} />;
}

export function Conversation({
  running,
  trajectory,
  written,
}: {
  readonly running: boolean;
  readonly trajectory: readonly EvalJournalEntry[];
  readonly written: Written;
}) {
  const parts = conversationOf(trajectory);

  if (parts.length === 0) {
    return (
      <ConversationEmptyState
        description={
          running ? "The first turn has not arrived yet." : undefined
        }
        icon={<ChatsCircleIcon className="size-5" />}
        title={running ? "Waiting for the agent" : "Nothing was journalled"}
      />
    );
  }

  return (
    <ConversationLog className="max-w-[78ch]">
      <ConversationContent>
        <AnimatePresence initial={false}>
          {parts.map((part, index) => (
            <motion.li className="min-w-0" key={part.key} {...RISE}>
              <Part
                live={running && index === parts.length - 1}
                part={part}
                written={written}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ConversationContent>
    </ConversationLog>
  );
}
