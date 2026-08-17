declare const Owned: unique symbol;

/**
 * A prompt's internal id, once it has been proven to belong to the caller's
 * organisation.
 *
 * The mutating repository methods take this rather than a bare string, so a
 * write can only reach a row that an org-scoped read returned. Without it the
 * scoping is a convention every call site has to remember, and the one that
 * forgets writes across tenants while still compiling.
 *
 * `requirePrompt` is the only place that mints one, which is what makes the
 * guarantee hold: it is minted from a query filtered by organisation.
 */
export type OwnedPromptId = string & { readonly [Owned]: true };
