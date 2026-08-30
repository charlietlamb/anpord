import type { PublicPrompt } from "@anpord/schema/public/shapes";
import { Console, Effect } from "effect";

export const json = (value: unknown) =>
  Console.log(JSON.stringify(value, null, 2));

export const promptContent = (prompt: PublicPrompt) =>
  Effect.sync(() => {
    process.stdout.write(prompt.content);
    if (!prompt.content.endsWith("\n")) {
      process.stdout.write("\n");
    }
  });

/** A result the caller may pipe into another tool, so it belongs on stdout
 * alongside the prompt content rather than beside the status messages. */
export const row = (line: string) =>
  Effect.sync(() => {
    process.stdout.write(`${line}\n`);
  });

export const note = (message: string) =>
  Effect.sync(() => {
    process.stderr.write(`${message}\n`);
  });

export const attended = Effect.sync(
  () => globalThis.process?.stdout?.isTTY === true
);
