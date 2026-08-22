import type { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import {
  DaytonaMark,
  E2bMark,
  OpenAiMark,
} from "@anpord/ui/components/brand/provider-marks";
import { CpuIcon, LaptopIcon } from "@phosphor-icons/react";
import type { ComponentType } from "react";

/** A vendor mark and a Phosphor icon are both just components taking a class,
 * so the badge can render either without knowing which it has. */
export type VariantIcon = ComponentType<{ readonly className?: string }>;

interface Presentation {
  readonly Icon: VariantIcon;
  readonly label: string;
}

const HARNESSES: Record<EvalHarness, Presentation> = {
  codex: { Icon: OpenAiMark, label: "Codex" },
};

const PROVIDERS: Record<EvalProvider, Presentation> = {
  daytona: { Icon: DaytonaMark, label: "Daytona" },
  e2b: { Icon: E2bMark, label: "E2B" },
  /* A real shell in a temporary directory on the server, which is why it
     takes the machine rather than the cloud. */
  local: { Icon: LaptopIcon, label: "Local" },
};

/**
 * Falls back rather than throwing.
 *
 * Cells written before a harness was removed still name it, and 523 stored
 * cells carry values this build no longer defines. A screen that threw on one
 * of them would be unable to show the history that makes a verdict legible.
 */
const unknown = (value: string): Presentation => ({
  Icon: CpuIcon,
  label: value,
});

export const harnessPresentation = (harness: string): Presentation =>
  HARNESSES[harness as EvalHarness] ?? unknown(harness);

export const providerPresentation = (provider: string): Presentation =>
  PROVIDERS[provider as EvalProvider] ?? unknown(provider);

/* Matched on the family rather than the exact name, so a model released next
   week is recognised without a deploy. */
export const modelPresentation = (model: string): Presentation =>
  model.startsWith("gpt-") || model.startsWith("o")
    ? { Icon: OpenAiMark, label: model }
    : unknown(model);

/** A harness and the version pinned with it, which is one identity: the cell
 * key hashes both, so a column naming one without the other compares against
 * something else. */
export const harnessLabel = (harness: string, version: string) =>
  `${harnessPresentation(harness).label} ${version}`;
