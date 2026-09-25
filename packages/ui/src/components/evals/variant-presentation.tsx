import type { EvalSandbox } from "@anpord/schema/domain/eval-definition";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import {
  AlibabaMark,
  CerebrasMark,
  ClaudeMark,
  CloudflareMark,
  CursorMark,
  DaytonaMark,
  DeepseekMark,
  E2bMark,
  FireworksMark,
  GoogleMark,
  GroqMark,
  MetaMark,
  MinimaxMark,
  MistralMark,
  ModalMark,
  MoonshotMark,
  OpenAiMark,
  OpencodeMark,
  PiMark,
  QwenMark,
  UpstashMark,
  VercelMark,
  XaiMark,
  ZaiMark,
} from "@anpord/ui/components/brand/provider-marks";
import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { shortProfileVersion } from "@anpord/ui/lib/evals/profile-version";
import {
  CpuIcon,
  DesktopTowerIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";

interface Presentation {
  readonly Icon: RailIcon;
  readonly label: string;
}

const HARNESSES: Record<EvalHarness, Presentation> = {
  claude: { Icon: ClaudeMark, label: "Claude Code" },
  codex: { Icon: OpenAiMark, label: "Codex" },
  command: { Icon: TerminalWindowIcon, label: "Command" },
  cursor: { Icon: CursorMark, label: "Cursor" },
  fx: { Icon: VercelMark, label: "FX" },
  gemini: { Icon: GoogleMark, label: "Gemini CLI" },
  opencode: { Icon: OpencodeMark, label: "OpenCode" },
  pi: { Icon: PiMark, label: "Pi" },
  qwen: { Icon: QwenMark, label: "Qwen Code" },
};

const SANDBOX_MARKS: Record<EvalSandbox, Presentation> = {
  cloudflare: { Icon: CloudflareMark, label: "Cloudflare" },
  daytona: { Icon: DaytonaMark, label: "Daytona" },
  e2b: { Icon: E2bMark, label: "E2B" },
  local: { Icon: DesktopTowerIcon, label: "Local" },
  upstash: { Icon: UpstashMark, label: "Upstash Box" },
  modal: { Icon: ModalMark, label: "Modal" },
  vercel: { Icon: VercelMark, label: "Vercel" },
};

const unknown = (value: string): Presentation => ({
  Icon: CpuIcon,
  label: value,
});

export const harnessPresentation = (harness: string): Presentation =>
  HARNESSES[harness as EvalHarness] ?? unknown(harness);

export const sandboxPresentation = (sandbox: string): Presentation =>
  SANDBOX_MARKS[sandbox as EvalSandbox] ?? unknown(sandbox);

export const placePresentation = (entry: {
  readonly local: boolean;
  readonly sandbox: string;
}): Presentation => sandboxPresentation(entry.local ? "local" : entry.sandbox);

export const integrationLabel = (integrationId: string): string =>
  (
    HARNESSES[integrationId as EvalHarness] ??
    SANDBOX_MARKS[integrationId as EvalSandbox] ??
    unknown(integrationId)
  ).label;

export const VENDOR_MARKS: Record<string, RailIcon> = {
  alibaba: AlibabaMark,
  anthropic: ClaudeMark,
  cerebras: CerebrasMark,
  deepseek: DeepseekMark,
  "fireworks-ai": FireworksMark,
  google: GoogleMark,
  groq: GroqMark,
  meta: MetaMark,
  minimax: MinimaxMark,
  "minimax-cn": MinimaxMark,
  mistral: MistralMark,
  moonshotai: MoonshotMark,
  "moonshotai-cn": MoonshotMark,
  openai: OpenAiMark,
  openrouter: OpencodeMark,
  "x-ai": XaiMark,
  xai: XaiMark,
  zai: ZaiMark,
  zhipuai: ZaiMark,
};
type ModelRule = readonly [pattern: RegExp, Icon: RailIcon];

const MODEL_RULES: readonly ModelRule[] = [
  [/^(?:gpt-|o\d(?:-|$)|chatgpt)/, OpenAiMark],
  [/^(?:claude|opus|sonnet|haiku)(?:-|$)/, ClaudeMark],
  [/^gemini(?:-|$)/, GoogleMark],
  [/^deepseek(?:-|$)/, DeepseekMark],
  [/^(?:mistral|codestral)(?:-|$)/, MistralMark],
  [/^(?:llama|meta-llama)(?:-|$)/, MetaMark],
  [/^qwen(?:-|$)/, QwenMark],
  [/^grok(?:-|$)/, XaiMark],
];
const MODEL_LABELS: Record<string, string> = {
  haiku: "Haiku (alias)",
  opus: "Opus (alias)",
  sonnet: "Sonnet (alias)",
};
const EXACT_CLAUDE_MODEL = /^(?:[^/]+\/)?claude-(opus|sonnet|haiku)-([\d-]+)/i;

const exactClaudeLabel = (model: string) => {
  const match = EXACT_CLAUDE_MODEL.exec(model);
  if (!match) {
    return;
  }

  const version = match[2]
    .split("-")
    .filter((part) => part.length < 4)
    .join(".");
  return `${match[1][0].toUpperCase()}${match[1].slice(1)} ${version}`;
};

export const modelPresentation = (model: string): Presentation => {
  const normalized = model.trim().toLowerCase();
  const slash = normalized.indexOf("/");

  if (slash > 0) {
    const Icon = VENDOR_MARKS[normalized.slice(0, slash)];

    return Icon === undefined
      ? unknown(model)
      : {
          Icon,
          label: exactClaudeLabel(normalized) ?? model.slice(slash + 1),
        };
  }

  const rule = MODEL_RULES.find(([pattern]) => pattern.test(normalized));
  return rule === undefined
    ? unknown(model)
    : {
        Icon: rule[1],
        label:
          exactClaudeLabel(normalized) ?? MODEL_LABELS[normalized] ?? model,
      };
};

export interface LabelledProfile {
  readonly name: string;
  readonly version: string;
}

const profileLabel = (profile: LabelledProfile) =>
  ["anpord-api", "anpord-cli", "anpord-mcp"].includes(profile.name)
    ? ""
    : `${profile.name}@${shortProfileVersion(profile.version)}`;

const baseLabel = (
  harness: string,
  version: string | undefined,
  profile: LabelledProfile | null | undefined
) => {
  if (harness === "command" && profile) {
    return "";
  }

  const own = harnessPresentation(harness).label;

  return version === undefined ? own : `${own} ${version}`;
};

export const harnessLabel = (
  harness: string,
  version?: string,
  profile?: LabelledProfile | null
) =>
  [baseLabel(harness, version, profile), profile ? profileLabel(profile) : ""]
    .filter((part) => part !== "")
    .join(" · ");
