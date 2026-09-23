import type { EvalCell, EvalTrial } from "@anpord/schema/domain/evals";

const START = 1_787_000_000_000;

const command = (input: {
  readonly command: string;
  readonly exitCode: number;
  readonly finished: number;
  readonly output?: string;
  readonly started: number;
}) => ({
  _tag: "command" as const,
  command: input.command,
  exitCode: input.exitCode,
  finishedAtMillis: START + input.finished,
  output: input.output ?? "",
  startedAtMillis: START + input.started,
});

const TRAJECTORY = [
  {
    _tag: "message" as const,
    finishedAtMillis: START + 6924,
    role: "assistant" as const,
    text: "I'll inspect the existing logo assets and footer usage first, then add the GitHub mark in the same format and naming convention.",
  },
  command({
    command: "pwd && rg --files -g 'public/logos/**' | sort",
    exitCode: 0,
    finished: 7893,
    output:
      "/tmp/anpord-task\npublic/logos/slack-dark.svg\npublic/logos/slack-light.svg\n",
    started: 7673,
  }),
  command({
    command: "sed -n '1,220p' public/logos/slack-dark.svg",
    exitCode: 0,
    finished: 11_402,
    output:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect fill="#ECB22E"/></svg>',
    started: 11_120,
  }),
  command({
    command: "sed -n '1,180p' app/components/Footer.tsx; git status --short",
    exitCode: 128,
    finished: 15_980,
    output:
      "fatal: not a git repository (or any of the parent directories): .git",
    started: 15_640,
  }),
  {
    _tag: "message" as const,
    finishedAtMillis: START + 21_050,
    role: "assistant" as const,
    text: "The repository's convention is a paired 24x24 SVG under public/logos. I'll preserve that convention.",
  },
  command({
    command:
      "curl -L --fail https://brand.github.com/GitHub_Logos.zip -o logos.zip",
    exitCode: 0,
    finished: 29_410,
    output:
      "Archive:  github-logos.zip\n  6148  GitHub Logos/SVG/GitHub_Invertocat_Black.svg",
    started: 26_480,
  }),
  {
    _tag: "fileChange" as const,
    finishedAtMillis: START + 31_200,
    paths: [
      "public/logos/github-light.svg",
      "public/logos/github-dark.svg",
      "app/components/Footer.tsx",
    ],
  },
  command({
    command:
      'for asset in public/logos/github-*.svg; do test -s "$asset"; done',
    exitCode: 0,
    finished: 34_120,
    started: 33_990,
  }),
] as const;

const EXIT_CODES: Partial<Record<EvalTrial["status"], number>> = {
  passed: 0,
  void: -1,
};

const VERIFY_STEPS = [
  "test -d public/logos",
  "test -f public/logos/github-light.svg",
  "test -f public/logos/github-dark.svg",
  "node -e \"if (require('fs').readdirSync('.').some((f) => f.startsWith('github'))) throw new Error('logo left outside public/logos')\"",
  'grep -q "<svg" public/logos/github-light.svg',
  'grep -q "<svg" public/logos/github-dark.svg',
];

const VERIFY = VERIFY_STEPS.join(" && ");

const trailOf = (status: EvalTrial["status"]): EvalTrial["verifySteps"] => {
  if (status === "passed") {
    return VERIFY_STEPS.map((command) => ({ command, exitCode: 0 }));
  }

  if (status === "failed") {
    return VERIFY_STEPS.slice(0, 3).map((command, index) => ({
      command,
      exitCode: index === 2 ? 1 : 0,
    }));
  }

  return [];
};

const trial = (input: {
  readonly commands: number;
  readonly failedCommands: number;
  readonly ordinal: number;
  readonly status: EvalTrial["status"];
  readonly tokens: number | null;
  readonly trajectory?: EvalTrial["trajectory"];
}): EvalTrial => ({
  commands: input.commands,
  costs:
    input.tokens === null
      ? null
      : {
          allocatedUsd: 0,
          components: [
            {
              classification: "estimate" as const,
              component: "model" as const,
              detail: {},
              explanation:
                "Priced at the model's published rate when the trial ran, not from a bill.",
              source: "models.dev",
              usd: 0.113,
            },
            {
              classification: "included" as const,
              component: "harness" as const,
              detail: { connectionMode: "subscription" },
              explanation:
                "The codex runtime bills nothing separately from the model it calls.",
              source: "connection",
              usd: null,
            },
            {
              classification: "managed" as const,
              component: "sandbox" as const,
              detail: { sessions: 1 },
              explanation: "Run on our daytona account and not billed to you.",
              source: "connection",
              usd: null,
            },
            {
              classification: "included" as const,
              component: "platform" as const,
              detail: { evalUnits: 1 },
              explanation:
                "Metered in eval units rather than priced per trial.",
              source: "platform",
              usd: null,
            },
          ],
          estimatedEquivalentUsd: 0.113,
          incomplete: false,
          knownActualUsd: 0,
        },
  exitCode: EXIT_CODES[input.status] ?? 1,
  failedCommands: input.failedCommands,
  filesChanged:
    input.status === "passed"
      ? ["public/logos/github-light.svg", "public/logos/github-dark.svg"]
      : [],
  modelMs: 89_579,
  ordinal: input.ordinal,
  passed: input.status === "passed",
  sandboxId: "sbx-4f2a",
  sandboxMs: 5922,
  prepared: null,
  status: input.status,
  timed: true,
  trajectory: input.trajectory ?? [],
  usage:
    input.tokens === null
      ? null
      : {
          cacheReadTokens: 231_400,
          cacheWriteTokens: 4820,
          inputTokens: 260_000,
          outputTokens: 12_717,
          totalTokens: input.tokens,
        },
  verifySteps: trailOf(input.status),
  voidFields: input.status === "void" ? ["stdout"] : [],
});

export const TRIALS: readonly EvalTrial[] = [
  {
    ...trial({
      commands: 6,
      failedCommands: 1,
      ordinal: 1,
      status: "passed",
      tokens: 272_717,
      trajectory: [...TRAJECTORY],
    }),
  },
  trial({
    commands: 8,
    failedCommands: 0,
    ordinal: 2,
    status: "passed",
    tokens: 296_177,
  }),
  trial({
    commands: 0,
    failedCommands: 0,
    ordinal: 3,
    status: "void",
    tokens: null,
  }),
];

export const FAILED_TRIAL: EvalTrial = trial({
  commands: 5,
  failedCommands: 1,
  ordinal: 4,
  status: "failed",
  tokens: 41_200,
});

export const CELL: EvalCell = {
  caseName: "github-logo-in-footer",
  cellKey: "e82b5274c0a2b4eaf3c4f11065b8f0cc",
  costs: null,
  comparison: {
    baselineHarnessVersion: "0.144.4",
    baselinePassRate: 1,
    baselineProfileVersion: null,
    candidateHarnessVersion: "0.145.0",
    candidatePassRate: 0.667,
    candidateProfileVersion: null,
    delta: -0.333,
    definitionChanged: false,
    determinismLost: true,
    reason: null,
    verdict: "regressed",
  },
  distribution: {
    commandMax: 8,
    commandMedian: 6,
    commandMin: 6,
    deterministic: false,
    failed: 0,
    passRate: 0.667,
    passed: 2,
    scored: 3,
    trials: 3,
    voided: 1,
  },
  internalId: "cell_9f21",
  setup: {
    prompt:
      "I'm building a Next.js marketing site and I want to show the GitHub logo in the footer. The site supports light and dark mode. I already keep brand assets in public/logos. Can you grab the GitHub logo for me and put it where it belongs?",
    repoRef: null,
    repoUrl: null,
    prepareName: null,
    validatorName: null,
    verifyCommand: VERIFY,
    workspace: "/tmp/anpord-task",
  },
  status: "finished",
  taskIndex: 0,
  trials: TRIALS,
};
