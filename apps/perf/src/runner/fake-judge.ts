const JUDGE_URL = "https://api.openai.com/v1/responses";

export interface FakeJudge {
  readonly calls: () => number;
  readonly restore: () => void;
}

interface JudgeBody {
  readonly text?: {
    readonly format?: {
      readonly schema?: {
        readonly properties?: {
          readonly choice?: { readonly enum?: readonly string[] };
        };
      };
    };
  };
}

export const JUDGE_TOKENS_PER_CALL = 1560;

const USAGE = {
  input_tokens: 1500,
  output_tokens: 60,
  total_tokens: JUDGE_TOKENS_PER_CALL,
};

const answer = (body: JudgeBody) => {
  const [choice] = body.text?.format?.schema?.properties?.choice?.enum ?? [
    "good",
  ];
  return {
    id: "resp_perf",
    model: "perf-fake-judge",
    output: [
      {
        content: [
          {
            text: JSON.stringify({ choice, reason: "The report is present." }),
            type: "output_text",
          },
        ],
        type: "message",
      },
    ],
    status: "completed",
    usage: USAGE,
  };
};

export const withFakeJudge = async <T>(
  body: (judge: FakeJudge) => Promise<T>
): Promise<T> => {
  const judge = installFakeJudge();
  try {
    return await body(judge);
  } finally {
    judge.restore();
  }
};

export const installFakeJudge = (): FakeJudge => {
  const real = globalThis.fetch;
  let calls = 0;
  const previousKey = process.env.OPENAI_API_KEY;
  const fake = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== JUDGE_URL) {
      return real(input, init);
    }
    calls += 1;
    const request = new Request(input, init);
    return Response.json(answer((await request.json()) as JudgeBody));
  };
  globalThis.fetch = Object.assign(fake, { preconnect: real.preconnect });
  process.env.OPENAI_API_KEY = "perf-fake-judge-key";
  return {
    calls: () => calls,
    restore: () => {
      globalThis.fetch = real;
      if (previousKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousKey;
      }
    },
  };
};
