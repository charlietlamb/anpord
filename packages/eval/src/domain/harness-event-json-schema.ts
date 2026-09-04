import { JSONSchema } from "effect";
import { CommandLine } from "./command-line";
import { HarnessEvent } from "./harness-event";

/** The event union as JSON Schema, for a customer validating their own output. */
export const harnessEventJsonSchema = JSONSchema.make(HarnessEvent);

/** Every stdout line a command harness may print: the events and the usage line. */
export const commandLineJsonSchema = JSONSchema.make(CommandLine);
