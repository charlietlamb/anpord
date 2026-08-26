import type { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import {
  AlibabaMark,
  AnthropicMark,
  CerebrasMark,
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

interface Presentation {
  readonly Icon: RailIcon;
  readonly label: string;
}

const HARNESSES: Record<EvalHarness, Presentation> = {
  claude: { Icon: AnthropicMark, label: "Claude Code" },
  codex: { Icon: OpenAiMark, label: "Codex" },
  cursor: { Icon: CursorMark, label: "Cursor" },
  fx: { Icon: TerminalWindowIcon, label: "FX" },
  gemini: { Icon: GoogleMark, label: "Gemini CLI" },
  opencode: { Icon: OpencodeMark, label: "OpenCode" },
  pi: { Icon: PiMark, label: "Pi" },
  qwen: { Icon: AlibabaMark, label: "Qwen Code" },
};

const PROVIDERS: Record<EvalProvider, Presentation> = {
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

export const providerPresentation = (provider: string): Presentation =>
  PROVIDERS[provider as EvalProvider] ?? unknown(provider);

/* An integration id names either side of a run, and a caller holding one from
   a credential does not know which. Harnesses are checked first because the
   two sets do not overlap and either order is correct. */
export const integrationLabel = (integrationId: string): string =>
  (
    HARNESSES[integrationId as EvalHarness] ??
    PROVIDERS[integrationId as EvalProvider] ??
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

export const harnessLabel = (harness: string, version: string) =>
  `${harnessPresentation(harness).label} ${version}`;
