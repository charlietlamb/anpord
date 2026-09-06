import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

/** Names the file each base discovers beside the code it is working on. */
const instructionsFileOf = (harness: RunHarness["harness"]) =>
  harness === "gemini" ? "GEMINI.md" : "AGENTS.md";

/* Best effort: these bases take no system prompt on the command line or in a
   variable, so the only place left is the instructions file they discover
   themselves, and a base that stops reading it reads no prompt. */
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
