import { ChatsCircleIcon } from "@phosphor-icons/react";
import type { EvalJournalEntry } from "@sphynx/schema/domain/eval-trial";
import {
  ConversationContent,
  Conversation as ConversationLog,
} from "@sphynx/ui/components/ai-elements/conversation";
import { EmptyState } from "@sphynx/ui/components/ui/empty-state";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  ConversationPart,
  type Written,
} from "@/components/evals/conversation-part";
import { FileSheet } from "@/components/evals/file-sheet";
import type { FileOpener } from "@/components/evals/markdown-prose";
import { Thinking } from "@/components/evals/thinking";
import {
  artifactFor,
  conversationOf,
  estimatedHeightOf,
  thinkingLabel,
} from "@/lib/evals/conversation";
import { waterfallLayout } from "@/lib/evals/waterfall-layout";
import { RISE } from "@/lib/motion";
import { useVirtualRows } from "@/lib/use-virtual-rows";

const THINKING_HEIGHT = 24;
const PART_GAP = 20;
const LOG_INSET = 8;

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
  const thinking = thinkingLabel(parts, running);
  const [settled] = useState<ReadonlySet<number | "thinking">>(
    () =>
      new Set([
        ...parts.map((part) => part.key),
        ...(thinking === null ? [] : ["thinking" as const]),
      ])
  );
  const [openWork, setOpenWork] = useState<ReadonlySet<number>>(new Set());
  const { height, listRef, measureRow, rows } =
    useVirtualRows<HTMLOListElement>({
      count: parts.length + (thinking === null ? 0 : 1),
      gap: PART_GAP,
      inset: LOG_INSET,
      pinned: parts.flatMap((part, index) =>
        openWork.has(part.key) ? [index] : []
      ),
      rowHeight: (index) => {
        const part = parts[index];
        return part === undefined ? THINKING_HEIGHT : estimatedHeightOf(part);
      },
    });
  const toggleWork = (key: number, open: boolean) =>
    setOpenWork((current) => {
      const next = new Set(current);
      if (open) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
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
        icon={<ChatsCircleIcon />}
        title={running ? "Waiting for the agent" : "Nothing was journalled"}
      />
    );
  }

  return (
    <ConversationLog className="mx-auto w-full max-w-[78ch]">
      <ConversationContent
        className="relative"
        ref={listRef}
        style={{ height }}
      >
        <AnimatePresence initial={false}>
          {rows.map(({ index, offset }) => {
            const part = parts[index];
            const key = part?.key ?? "thinking";
            return (
              <motion.li
                className="absolute inset-x-0 min-w-0"
                data-index={index}
                key={key}
                ref={measureRow}
                style={{ top: offset }}
                {...RISE}
                initial={settled.has(key) ? false : RISE.initial}
              >
                {part === undefined ? (
                  <Thinking label={thinking ?? ""} />
                ) : (
                  <ConversationPart
                    live={running && index === parts.length - 1}
                    onOpenChange={(open) => toggleWork(part.key, open)}
                    open={openWork.has(part.key)}
                    openerFor={openerFor}
                    part={part}
                    took={tookOf(part.key)}
                    written={written}
                  />
                )}
              </motion.li>
            );
          })}
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
