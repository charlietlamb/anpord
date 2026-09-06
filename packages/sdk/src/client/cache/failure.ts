import type { AnpordError } from "../errors";

/** Statuses the server chose deliberately, about the request rather than its
 * own health. */
const DEFINITIVE = new Set([400, 401, 403, 404, 409, 422]);

/** Unavailable means fall back; a definitive no must not, or a typo'd prompt
 * id becomes a silent permanent substitution. Unrecognised counts as
 * unavailable, since a transport error carries no status. */
export const isAvailabilityFailure = (error: AnpordError) =>
  error.status === undefined || !DEFINITIVE.has(error.status);
