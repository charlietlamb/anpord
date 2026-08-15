import type { PublicPrompt } from "@anpord/schema/public/shapes";
import { Console, Effect } from "effect";

export const json = (value: unknown) =>
  Console.log(JSON.stringify(value, null, 2));

/**
 * Content goes to stdout alone so `anpord get x > prompt.txt` is the whole
 * file, and everything describing it goes to stderr.
 */
export const promptContent = (prompt: PublicPrompt) =>
  Effect.sync(() => {
    process.stdout.write(prompt.content);
    if (!prompt.content.endsWith("\n")) {
      process.stdout.write("\n");
    }
  });

export const note = (message: string) =>
  Effect.sync(() => {
    process.stderr.write(`${message}\n`);
  });
