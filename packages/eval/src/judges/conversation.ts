import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";

const TEXT_LIMIT = 4000;
const CONVERSATION_LIMIT = 48_000;

type Said =
  | { readonly user: string }
  | { readonly agent: string }
  | {
      readonly command: string;
      readonly exitCode: number | null;
      readonly output: string;
    }
  | {
      readonly tool: string;
      readonly input?: string;
      readonly output?: string;
      readonly error?: string;
    }
  | { readonly wrote: readonly string[] }
  | { readonly omitted: number };

const clipped = (text: string) =>
  text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT)} [truncated]` : text;

const clippedIfPresent = (text: string | undefined) =>
  text === undefined ? undefined : clipped(text);

const saidOf = (event: HarnessEvent): readonly Said[] => {
  switch (event._tag) {
    case "Message":
      return [
        event.role === "user"
          ? { user: clipped(event.text) }
          : { agent: clipped(event.text) },
      ];
    case "Command":
      return [
        {
          command: clipped(event.command),
          exitCode: event.exitCode,
          output: clipped(event.output),
        },
      ];
    case "ToolCall":
      return [
        {
          tool: event.name,
          input: clippedIfPresent(event.input),
          output: clippedIfPresent(event.output),
          error: clippedIfPresent(event.error),
        },
      ];
    case "FileChange":
      return [{ wrote: event.paths }];
    default:
      return [];
  }
};

const sizeOf = (said: Said) => JSON.stringify(said).length + 1;

const countWithin = (entries: readonly Said[], budget: number) => {
  let used = 0;
  let count = 0;

  for (const said of entries) {
    used += sizeOf(said);
    if (used > budget) {
      break;
    }
    count += 1;
  }

  return count;
};

const fitted = (entries: readonly Said[]): readonly Said[] => {
  const total = entries.reduce((sum, said) => sum + sizeOf(said), 0);

  if (total <= CONVERSATION_LIMIT) {
    return entries;
  }

  const half = CONVERSATION_LIMIT / 2;
  const head = countWithin(entries, half);
  const tail = countWithin([...entries].reverse(), half);

  return [
    ...entries.slice(0, head),
    { omitted: entries.length - head - tail },
    ...entries.slice(entries.length - tail),
  ];
};

export const conversationEvidence = (events: readonly HarnessEvent[]) =>
  fitted(events.flatMap(saidOf));
