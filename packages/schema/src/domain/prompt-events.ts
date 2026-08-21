import { Schema } from "effect";

/**
 * What a stored event records. Kept as its own literal rather than derived from
 * the activity union, because this is what the column holds: the union is how
 * an entry is read, this is how one is written.
 */
export const PromptEventKind = Schema.Literal("saved", "overwrote", "deployed");
export type PromptEventKind = typeof PromptEventKind.Type;
