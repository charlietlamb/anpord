import type { StoredKey } from "./harness/api-keys";

export interface World {
  readonly baseUrl: string;
  readonly directory: string;
  /* A second organization, so tenant isolation can be checked rather than assumed. */
  readonly otherKey: StoredKey;
  readonly otherSessionToken: string;
  /* For asserting against what was stored, not only what the response claimed. */
  readonly query: <Row>(
    sql: string,
    values?: readonly unknown[]
  ) => Promise<readonly Row[]>;
  readonly repositoryRoot: string;
  /* The dashboard signs in rather than carrying a key, so its own actions need a session. */
  readonly sessionToken: string;
  readonly writeKey: StoredKey;
}
