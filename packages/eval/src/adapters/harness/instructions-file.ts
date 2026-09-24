import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

const instructionsFileOf = (harness: RunHarness["harness"]) =>
  harness === "gemini" ? "GEMINI.md" : "AGENTS.md";

export const instructionsPrefix = (request: RunHarness): string =>
  Option.match(request.systemPromptPath, {
    onNone: () => "",
    onSome: (path) => {
      const file = `${request.workspace}/${instructionsFileOf(request.harness)}`;
      const staged = shellQuote(`${file}.anpord`);

      return [
        `{ cat ${shellQuote(path)}; printf '\\n\\n---\\n\\n';`,
        `cat ${shellQuote(file)} 2>/dev/null; } > ${staged}`,
        `&& mv ${staged} ${shellQuote(file)}`,
        "&& ",
      ].join(" ");
    },
  });
