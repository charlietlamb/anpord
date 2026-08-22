import type {
  EvalCell,
  EvalRunSummary,
  EvalTrial,
} from "@anpord/schema/domain/evals";
import { DateTime } from "effect";

/* Copied from real rows. The `git status` exit 128 that every a customer trial hit
   and recovered from is kept, because it is the case the design has to get
   right. */

const START = 1_787_000_000_000;

const at = (offset: number) => DateTime.unsafeMake(START + offset);

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

export const TRAJECTORY = [
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

/* -1 is the sentinel a trial nothing decided carries. */
const EXIT_CODES: Partial<Record<EvalTrial["status"], number>> = {
  passed: 0,
  void: -1,
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
  status: input.status,
  timed: true,
  trajectory: input.trajectory ?? [],
  usage:
    input.tokens === null
      ? null
      : {
          inputTokens: 260_000,
          outputTokens: 12_717,
          totalTokens: input.tokens,
        },
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
    setupCommand: null,
    verifyCommand:
      'set -e\n\n# 1. saved under the existing assets folder, not a new directory\ntest -d public/logos\n\n# 2. both a light and a dark variant\ntest -f public/logos/github-light.svg\ntest -f public/logos/github-dark.svg\n\n# 4. the convention was inferred: no logo landed anywhere else\ntest -z "$(find . -name \'github*.svg\' -not -path \'./public/logos/*\')"\n\n# the files are real svg, not empty placeholders\ngrep -q "<svg" public/logos/github-light.svg\ngrep -q "<svg" public/logos/github-dark.svg',
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

export const RUNS: readonly EvalRunSummary[] = [
  {
    caseCount: 1,
    commandMax: 8,
    commandMin: 6,
    failure: null,
    finishedAt: at(108_000),
    id: "run_MCGA1APRP7ZETMRJ66W40FCE",
    name: "notra/brand-logos",
    passed: 3,
    scored: 3,
    startedAt: at(0),
    status: "finished",
    taskCount: 1,
    voided: 0,
  },
  {
    caseCount: 1,
    commandMax: 2,
    commandMin: 1,
    failure: "abandoned: the process running this did not finish it",
    finishedAt: at(44_000),
    id: "run_540CDY1NPF4DWF22AM389CQZ",
    name: "onyx/craft",
    passed: 0,
    scored: 0,
    startedAt: at(-3_600_000),
    status: "failed",
    taskCount: 1,
    voided: 3,
  },
  {
    caseCount: 3,
    commandMax: 13,
    commandMin: 11,
    failure: null,
    finishedAt: null,
    id: "run_ECQCAZCX7CM57CK1MARQREF7",
    name: "notra/react-doctor",
    passed: 0,
    scored: 0,
    startedAt: at(-120_000),
    status: "running",
    taskCount: 2,
    voided: 0,
  },
  {
    caseCount: 1,
    commandMax: 9,
    commandMin: 6,
    failure: null,
    finishedAt: at(-86_300_000),
    id: "run_YMBJ190C0Q0T2H8VMYDMYPFQ",
    name: "notra/brand-logos",
    passed: 2,
    scored: 3,
    startedAt: at(-86_400_000),
    status: "finished",
    taskCount: 1,
    voided: 1,
  },
];
