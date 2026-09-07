import type { EvalTrigger } from "@anpord/schema/domain/eval-trigger";
import {
  BrowserIcon,
  CodeIcon,
  GitBranchIcon,
  PlugsConnectedIcon,
  QuestionIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { GithubIcon } from "@/components/icons/github-icon";

const triggers = {
  api: { label: "API", Icon: CodeIcon },
  ci: { label: "CI", Icon: GitBranchIcon },
  cli: { label: "CLI", Icon: TerminalIcon },
  dashboard: { label: "Dashboard", Icon: BrowserIcon },
  mcp: { label: "MCP", Icon: PlugsConnectedIcon },
};

export const triggerPresentation = (trigger: EvalTrigger | null) => {
  if (trigger === null) {
    return { label: "Unknown", Icon: QuestionIcon };
  }
  if (
    trigger.source === "ci" &&
    trigger.url?.startsWith("https://github.com/")
  ) {
    return { label: "GitHub Actions", Icon: GithubIcon };
  }
  return triggers[trigger.source];
};
