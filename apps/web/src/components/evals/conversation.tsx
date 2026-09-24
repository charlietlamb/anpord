import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import {
  ConversationContent,
  Conversation as ConversationLog,
} from "@anpord/ui/components/ai-elements/conversation";
import { EmptyState } from "@anpord/ui/components/ui/empty-state";
import { ChatsCircleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  ConversationPart,
  type Written,
} from "@/components/evals/conversation-part";
import { FileSheet } from "@/components/evals/file-sheet";
import type { FileOpener } from "@/components/evals/markdown-prose";
import { artifactFor, conversationOf } from "@/lib/evals/conversation";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";
import { RISE } from "@/lib/motion";

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
      <EmptyState
        description={
          running ? "The first turn has not arrived yet." : undefined
        }
        frame="bare"
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
              <ConversationPart
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
