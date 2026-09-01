import type {
  EvalCell,
  EvalRun,
  EvalRunSummary,
  EvalTask,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

const START = 1_787_000_000_000;

const at = (offset: number) => DateTime.unsafeMake(START + offset);

export const TASK: EvalTask = {
  harness: "codex",
  harnessVersion: "0.144.4",
  model: "gpt-5-codex",
  provider: "daytona",
};

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

/** The trail a passing trial leaves, and the one that stopped at the third
 * step, so a preview shows every mark the rail can carry. */
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
  /* Every classification the interface has to render, so the fixture exercises
     the ones that must never show a number as readily as the one that does. */
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

/** A trial that stopped at the third check, so a rail can show a cross and
 * the steps it never reached. */
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
  comparison: {
    baselinePassRate: 1,
    candidatePassRate: 0.667,
    delta: -0.333,
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

export const CELL_NO_BASELINE: EvalCell = {
  ...CELL,
  caseName: "react-doctor-diagnoses",
  cellKey: "9c4f0d41f90158e6aecaccdab6deb988",
  comparison: null,
  distribution: {
    commandMax: 12,
    commandMedian: 11,
    commandMin: 11,
    deterministic: true,
    failed: 0,
    passRate: 1,
    passed: 3,
    scored: 3,
    trials: 3,
    voided: 0,
  },
};

const RIVAL_TASK: EvalTask = { ...TASK, model: "gpt-5.6-sol" };

const rivalOf = (cell: EvalCell, key: string): EvalCell => ({
  ...cell,
  cellKey: key,
  comparison: null,
  distribution: {
    commandMax: 3,
    commandMedian: 2,
    commandMin: 2,
    deterministic: true,
    failed: 0,
    passRate: 1,
    passed: 3,
    scored: 3,
    trials: 3,
    voided: 0,
  },
  taskIndex: 1,
});

/** Two cases against two variants, so the grid has something to lead on. */
export const RUN: EvalRun = {
  cases: [CELL.caseName, CELL_NO_BASELINE.caseName],
  cells: [
    CELL,
    rivalOf(CELL, "1b7d2c4e6f8a9b0c1d2e3f4a5b6c7d8e"),
    CELL_NO_BASELINE,
    rivalOf(CELL_NO_BASELINE, "2c8e3d5f7a9b0c1d2e3f4a5b6c7d8e9f"),
  ],
  failure: null,
  finishedAt: at(108_000),
  id: "run_MCGA1APRP7ZETMRJ66W40FCE",
  startedAt: at(0),
  status: "finished",
  tasks: [TASK, RIVAL_TASK],
};

export const RUNS: readonly EvalRunSummary[] = [
  {
    caseCount: 1,
    columns: [
      {
        harness: "codex",
        harnessVersion: "0.144.4",
        model: "gpt-5.6-sol",
        provider: "daytona",
      },
    ],
    commandMax: 8,
    commandMin: 6,
    failure: null,
    finishedAt: at(108_000),
    id: "run_MCGA1APRP7ZETMRJ66W40FCE",
    name: "assets/brand-logos",
    passed: 3,
    scored: 3,
    startedAt: at(0),
    status: "finished",
    taskCount: 1,
    voided: 0,
  },
  {
    caseCount: 1,
    columns: [
      {
        harness: "codex",
        harnessVersion: "0.144.4",
        model: "gpt-5.6-sol",
        provider: "daytona",
      },
      {
        harness: "codex",
        harnessVersion: "0.144.4",
        model: "gpt-5.5",
        provider: "e2b",
      },
    ],
    commandMax: 2,
    commandMin: 1,
    failure: "abandoned: the process running this did not finish it",
    finishedAt: at(44_000),
    id: "run_540CDY1NPF4DWF22AM389CQZ",
    name: "docs/craft",
    passed: 0,
    scored: 0,
    startedAt: at(-3_600_000),
    status: "failed",
    taskCount: 1,
    voided: 3,
  },
  {
    caseCount: 3,
    columns: [],
    commandMax: 13,
    commandMin: 11,
    failure: null,
    finishedAt: null,
    id: "run_ECQCAZCX7CM57CK1MARQREF7",
    name: "lint/react-doctor",
    passed: 0,
    scored: 0,
    startedAt: at(-120_000),
    status: "running",
    taskCount: 2,
    voided: 0,
  },
  {
    caseCount: 1,
    columns: [
      {
        harness: "codex",
        harnessVersion: "0.144.4",
        model: "gpt-5.6-sol",
        provider: "daytona",
      },
    ],
    commandMax: 9,
    commandMin: 6,
    failure: null,
    finishedAt: at(-86_300_000),
    id: "run_YMBJ190C0Q0T2H8VMYDMYPFQ",
    name: "assets/brand-logos",
    passed: 2,
    scored: 3,
    startedAt: at(-86_400_000),
    status: "finished",
    taskCount: 1,
    voided: 1,
  },
];
