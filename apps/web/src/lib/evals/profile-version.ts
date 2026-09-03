/* A profile version is 32 hex characters of a content hash. Eight are enough
   to tell two readings of one profile apart on screen, and the whole string
   is a wall of digits beside a harness version anybody can read. */
const SHOWN = 8;

export const shortProfileVersion = (version: string) => version.slice(0, SHOWN);
