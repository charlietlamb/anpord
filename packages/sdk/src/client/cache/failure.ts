import type { AnpordError } from "../errors";

/** A status the server chose deliberately, telling the caller something true
 * about their request rather than about its own health. */
const DEFINITIVE = new Set([400, 401, 403, 404, 409, 422]);

/**
 * Whether a failure means the answer is unavailable rather than no.
 *
 * A 404 is a successful reply carrying real information: this prompt does not
 * exist. Covering it with a fallback turns a typo in a prompt id into a silent
 * permanent substitution that ships and is found weeks later. Serving stale
 * content covers the case where a prompt someone was using is removed, and it
 * sits ahead of the fallback anyway.
 *
 * An unrecognised failure counts as unavailable: a transport error carries no
 * status at all, and guessing the other way would turn a flaky network into an
 * outage.
 */
export const isAvailabilityFailure = (error: AnpordError) =>
  error.status === undefined || !DEFINITIVE.has(error.status);
