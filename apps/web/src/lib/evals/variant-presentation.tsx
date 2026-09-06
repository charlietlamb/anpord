import type { EvalHarness, EvalSandbox } from "@anpord/schema/domain/evals";
import {
  AlibabaMark,
  AnthropicMark,
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
  UpstashMark,
  VercelMark,
  XaiMark,
  ZaiMark,
} from "@anpord/ui/components/brand/provider-marks";
import type { RailIcon } from "@anpord/ui/components/ui/rail-fact";
import { CpuIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { shortProfileVersion } from "@/lib/evals/profile-version";

interface Presentation {
  readonly Icon: RailIcon;
  readonly label: string;
}

const HARNESSES: Record<EvalHarness, Presentation> = {
  claude: { Icon: ClaudeMark, label: "Claude Code" },
  codex: { Icon: OpenAiMark, label: "Codex" },
  /* No vendor mark: the process is the customer's own, named by the profile beside it. */
  command: { Icon: TerminalWindowIcon, label: "Command" },
  cursor: { Icon: CursorMark, label: "Cursor" },
  /* Vercel Labs ships fx, and the gateway key it takes is a Vercel key. */
  fx: { Icon: VercelMark, label: "FX" },
  gemini: { Icon: GoogleMark, label: "Gemini CLI" },
  opencode: { Icon: OpencodeMark, label: "OpenCode" },
  pi: { Icon: PiMark, label: "Pi" },
  qwen: { Icon: AlibabaMark, label: "Qwen Code" },
};

const SANDBOX_MARKS: Record<EvalSandbox, Presentation> = {
  cloudflare: { Icon: CloudflareMark, label: "Cloudflare" },
  daytona: { Icon: DaytonaMark, label: "Daytona" },
  e2b: { Icon: E2bMark, label: "E2B" },
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

/* An integration id names either side of a run and the two sets do not overlap, so either order is correct. */
export const integrationLabel = (integrationId: string): string =>
  (
    HARNESSES[integrationId as EvalHarness] ??
    SANDBOX_MARKS[integrationId as EvalSandbox] ??
    unknown(integrationId)
  ).label;

const VENDOR_MARKS: Record<string, RailIcon> = {
  alibaba: AlibabaMark,
  anthropic: AnthropicMark,
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

export const modelPresentation = (model: string): Presentation => {
  const slash = model.indexOf("/");

  if (slash > 0) {
    const Icon = VENDOR_MARKS[model.slice(0, slash)];

    return Icon === undefined
      ? unknown(model)
      : { Icon, label: model.slice(slash + 1) };
  }

  return model.startsWith("gpt-") || model.startsWith("o")
    ? { Icon: OpenAiMark, label: model }
    : unknown(model);
};

export interface LabelledProfile {
  readonly name: string;
  readonly version: string;
}

const profileLabel = (profile: LabelledProfile) =>
  ["anpord-cli", "anpord-mcp"].includes(profile.name)
    ? ""
    : `${profile.name}@${shortProfileVersion(profile.version)}`;

/* The command harness stores the literal `profile` as its version, so only the profile beside it says what ran. */
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
