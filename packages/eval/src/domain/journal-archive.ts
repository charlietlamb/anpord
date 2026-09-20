import { HarnessEvent } from "@anpord/schema/domain/harness-event";
import { Schema } from "effect";

/* The version is pinned: a format change is a migration that rewrites the rows,
   not a branch on read. */
const ArchivedJournal = Schema.Struct({
  events: Schema.Array(HarnessEvent),
  version: Schema.Literal(1),
});

export const decodeArchivedJournal = Schema.decodeUnknown(ArchivedJournal);
