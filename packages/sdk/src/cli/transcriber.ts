import { Effect, Ref } from "effect";
import {
  EMPTY_TRANSCRIPT,
  type Settled,
  type Spoken,
  settle,
  type Transcript,
  transcribe,
} from "./transcript";
import type { TranscriptStyle } from "./transcript-writer";

export const makeTranscriber = (style: TranscriptStyle) =>
  Effect.map(Ref.make(EMPTY_TRANSCRIPT), (held) => {
    const advance = (
      step: (transcript: Transcript) => ReturnType<typeof transcribe>
    ) =>
      Ref.modify(held, (transcript) => {
        const next = step(transcript);

        return [next.lines, next.transcript] as const;
      });

    return {
      settle: (settled: readonly Settled[]) =>
        advance((transcript) => settle(transcript, settled, style)),
      transcribe: (spoken: readonly Spoken[]) =>
        advance((transcript) => transcribe(transcript, spoken, style)),
    };
  });
