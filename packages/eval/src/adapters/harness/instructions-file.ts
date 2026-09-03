import { Option } from "effect";
import type { RunHarness } from "../../ports/harness";
import { shellQuote } from "./process";

/** Names the file each base discovers beside the code it is working on. */
const instructionsFileOf = (harness: RunHarness["harness"]) =>
  harness === "gemini" ? "GEMINI.md" : "AGENTS.md";

/*
   Best effort. These bases take no system prompt on the command line and read
   no variable naming one, so the only place left for a profile's prompt is the
   instructions file the base already discovers in its working directory.
   Prepended rather than appended, and separated by a rule, so a profile's own
   instructions keep their meaning under the prompt rather than after it. A
   base that stops reading that file reads no prompt, which is why this is
   documented as best effort rather than as delivery.
*/
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
