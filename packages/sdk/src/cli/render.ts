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

export const note = (message: string) =>
  Effect.sync(() => {
    process.stderr.write(`${message}\n`);
  });
