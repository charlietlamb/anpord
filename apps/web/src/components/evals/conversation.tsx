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
import { useState } from "react";
import { ConversationWork } from "@/components/evals/conversation-work";
import {
  ConversationWrote,
  type TrialRef,
} from "@/components/evals/conversation-wrote";
import { FileSheet } from "@/components/evals/file-sheet";
import {
  type FileOpener,
  MarkdownProse,
} from "@/components/evals/markdown-prose";
import {
  artifactFor,
  type ConversationPart,
  conversationOf,
} from "@/lib/evals/conversation";
import { seconds } from "@/lib/evals/duration";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";
import { RISE } from "@/lib/motion";

interface Written {
  readonly artifacts: readonly EvalArtifactMetadata[];
  readonly trial: TrialRef;
}

function Took({ ms }: { readonly ms: number | null }) {
  return ms === null || ms === 0 ? null : (
    <span className="px-1 text-muted-foreground text-xs tabular-nums">
      {seconds(ms)}
    </span>
  );
}

function Part({
  live,
  openerFor,
  took,
  part,
  written,
}: {
  readonly live: boolean;
  readonly openerFor: FileOpener;
  readonly took: number | null;
  readonly part: ConversationPart;
  readonly written: Written;
}) {
  if (part._tag === "said") {
    return (
      <Message from="user">
        <MessageContent>{part.text}</MessageContent>
        <Took ms={took} />
      </Message>
    );
  }

  if (part._tag === "replied") {
    return (
      <Message from="assistant">
        <MessageContent>
          <MarkdownProse openerFor={openerFor} text={part.text} />
        </MessageContent>
        <Took ms={took} />
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
  const [openPath, setOpenPath] = useState<string | null>(null);
  const parts = conversationOf(trajectory);
  const openerFor: FileOpener = (path) =>
    artifactFor(path, written.artifacts) === undefined
      ? null
      : () => setOpenPath(path);
  const leads = new Map(
    waterfallLayout(trajectory).rows.map((row) => [
      row.entry,
      row.lead?.durationMs ?? null,
    ])
  );
  const tookOf = (key: number) => {
    const entry = trajectory[key];

    return entry === undefined ? null : (leads.get(entry) ?? null);
  };

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
    <ConversationLog className="mx-auto w-full max-w-[78ch]">
      <ConversationContent>
        <AnimatePresence initial={false}>
          {parts.map((part, index) => (
            <motion.li className="min-w-0" key={part.key} {...RISE}>
              <Part
                live={running && index === parts.length - 1}
                openerFor={openerFor}
                part={part}
                took={tookOf(part.key)}
                written={written}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ConversationContent>
      <FileSheet
        file={
          openPath === null
            ? undefined
            : artifactFor(openPath, written.artifacts)
        }
        onClose={() => setOpenPath(null)}
        trial={written.trial}
      />
    </ConversationLog>
  );
}
