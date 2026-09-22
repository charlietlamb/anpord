export interface Speaker {
  readonly caseName: string;
  readonly key: string;
  readonly ordinal: number | null;
  readonly variant: string;
}

export interface Turn {
  readonly costUsd: number | null;
  readonly endedAt: number | null;
  readonly number: number;
  readonly open: boolean;
  readonly replied: boolean;
  readonly speaker: Speaker;
  readonly startedAt: number | null;
}

interface Reply {
  readonly costUsd: number | null;
  readonly finishedAtMillis: number | null;
}

const SECOND = 1000;
const MINUTE = 60;
const CENT = 0.01;

export const openedTurn = (
  previous: Turn | undefined,
  speaker: Speaker,
  startedAt: number | null
): Turn => ({
  costUsd: null,
  endedAt: null,
  number: (previous?.number ?? 0) + 1,
  open: true,
  replied: false,
  speaker,
  startedAt,
});

export const repliedTurn = (
  previous: Turn | undefined,
  speaker: Speaker,
  reply: Reply
): Turn => {
  const turn = previous ?? openedTurn(undefined, speaker, null);

  return {
    ...turn,
    costUsd:
      reply.costUsd === null
        ? turn.costUsd
        : (turn.costUsd ?? 0) + reply.costUsd,
    endedAt: reply.finishedAtMillis ?? turn.endedAt,
    open: true,
    replied: true,
  };
};

const durationOf = (turn: Turn) => {
  if (turn.startedAt === null || turn.endedAt === null) {
    return null;
  }

  const seconds = Math.max(0, turn.endedAt - turn.startedAt) / SECOND;

  return seconds < MINUTE
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / MINUTE)}m${String(Math.round(seconds % MINUTE)).padStart(2, "0")}s`;
};

const costOf = (turn: Turn) => {
  if (turn.costUsd === null) {
    return null;
  }

  return turn.costUsd > 0 && turn.costUsd < CENT
    ? "<$0.01"
    : `$${turn.costUsd.toFixed(2)}`;
};

export const turnFacts = (turn: Turn) =>
  [`turn ${turn.number}`, durationOf(turn), costOf(turn)]
    .filter((fact): fact is string => fact !== null)
    .join(" · ");
