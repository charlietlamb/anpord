import type { EvalJournalEntry } from "@anpord/schema/domain/evals";
import type { Paint } from "./paint";
import { stepLine } from "./transcript-step";
import {
  openedTurn,
  repliedTurn,
  type Speaker,
  type Turn,
  turnFacts,
} from "./transcript-turn";
import { type Verdict, verdictLines } from "./transcript-verdict";
import {
  type TranscriptStyle,
  type Writer,
  writerFor,
} from "./transcript-writer";

export interface Spoken {
  readonly entry: EvalJournalEntry;
  readonly speaker: Speaker;
}

export interface Settled {
  readonly speaker: Speaker;
  readonly verdict: Verdict;
}

export interface Transcript {
  readonly closed: ReadonlySet<string>;
  readonly current: string | null;
  readonly printed: boolean;
  readonly turns: ReadonlyMap<string, Turn>;
}

export const EMPTY_TRANSCRIPT: Transcript = {
  closed: new Set(),
  current: null,
  printed: false,
  turns: new Map(),
};

class Draft {
  readonly closed: Set<string>;
  current: string | null;
  readonly lines: string[] = [];
  readonly turns: Map<string, Turn>;
  readonly write: Writer;
  private readonly printed: boolean;

  constructor(transcript: Transcript, style: TranscriptStyle) {
    this.closed = new Set(transcript.closed);
    this.current = transcript.current;
    this.printed = transcript.printed;
    this.turns = new Map(transcript.turns);
    this.write = writerFor(style);
  }

  enter(speaker: Speaker) {
    if (speaker.key !== this.current) {
      if (this.printed || this.lines.length > 0) {
        this.lines.push("");
      }

      this.lines.push(this.write.header(speaker));
      this.current = speaker.key;
    }
  }

  say(label: string, tone: Paint, text: string) {
    this.lines.push(
      ...this.write.heading(label, tone),
      ...this.write.indented(text, 1)
    );
  }

  closeTurn(key: string) {
    const turn = this.turns.get(key);

    if (turn?.open === true) {
      const { blank, line, paint } = this.write;

      this.lines.push(
        blank,
        line(
          turn.replied
            ? `${paint.green("✓")} ${paint.dim(turnFacts(turn))}`
            : paint.dim(`· ${turnFacts(turn)} · no reply`)
        )
      );
      this.turns.set(key, { ...turn, open: false });
    }
  }

  done() {
    return {
      lines: this.lines,
      transcript: {
        closed: this.closed,
        current: this.current,
        printed: this.printed || this.lines.length > 0,
        turns: this.turns,
      } satisfies Transcript,
    };
  }
}

export const transcribe = (
  transcript: Transcript,
  spoken: readonly Spoken[],
  style: TranscriptStyle
) => {
  const draft = new Draft(transcript, style);
  const { paint } = draft.write;

  for (const { entry, speaker } of spoken) {
    draft.enter(speaker);

    if (entry._tag !== "message") {
      draft.lines.push(stepLine(entry, draft.write));
    } else if (entry.role === "user") {
      draft.closeTurn(speaker.key);
      draft.turns.set(
        speaker.key,
        openedTurn(draft.turns.get(speaker.key), entry.finishedAtMillis ?? null)
      );
      draft.say("user", paint.cyan, entry.text);
    } else {
      draft.turns.set(
        speaker.key,
        repliedTurn(draft.turns.get(speaker.key), {
          costUsd: entry.usage?.costUsd ?? null,
          finishedAtMillis: entry.finishedAtMillis ?? null,
        })
      );
      draft.say("agent", paint.magenta, entry.text);
    }
  }

  return draft.done();
};

export const settle = (
  transcript: Transcript,
  settled: readonly Settled[],
  style: TranscriptStyle
) => {
  const draft = new Draft(transcript, style);

  for (const { speaker, verdict } of settled) {
    if (!draft.closed.has(speaker.key)) {
      draft.enter(speaker);
      draft.closeTurn(speaker.key);
      draft.lines.push(...verdictLines(verdict, draft.write));
      draft.closed.add(speaker.key);
      draft.current = null;
    }
  }

  return draft.done();
};
