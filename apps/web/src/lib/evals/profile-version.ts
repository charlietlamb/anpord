/* A profile version is 32 hex characters of a content hash; eight tell two readings apart on screen. */
const SHOWN = 8;

export const shortProfileVersion = (version: string) => version.slice(0, SHOWN);
