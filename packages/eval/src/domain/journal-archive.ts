import { Schema } from "effect";
import { HarnessEvent } from "./harness-event";

/** The shape a compacted journal is read back through.
 *
 * The version is pinned rather than read from the row: an archive is written
 * by this build and read by a later one, and a format change is a migration
 * that rewrites the rows, not a branch on read. */
const ArchivedJournal = Schema.Struct({
  events: Schema.Array(HarnessEvent),
  version: Schema.Literal(1),
});

export const decodeArchivedJournal = Schema.decodeUnknown(ArchivedJournal);
