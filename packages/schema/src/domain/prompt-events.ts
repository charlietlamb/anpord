import { Schema } from "effect";

/* Its own literal rather than derived from the activity union: this is what the column holds. */
export const PromptEventKind = Schema.Literal("saved", "overwrote", "deployed");
export type PromptEventKind = typeof PromptEventKind.Type;
