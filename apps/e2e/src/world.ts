import type { StoredKey } from "./harness/api-keys";

/**
 * What a scenario is given. Everything here is something a scenario reads;
 * anything it does not read belongs in the harness that built it.
 */
export interface World {
  readonly baseUrl: string;
  /** A workspace the CLI and generated declarations can write into. */
  readonly directory: string;
  /** A second organization, so tenant isolation is something a scenario can
   * check rather than assume. */
  readonly otherKey: StoredKey;
  readonly otherSessionToken: string;
  /** For asserting against what was stored, rather than only against what the
   * response claimed. */
  readonly query: <Row>(
    sql: string,
    values?: readonly unknown[]
  ) => Promise<readonly Row[]>;
  readonly repositoryRoot: string;
  /** The dashboard signs in rather than carrying a key, so anything only it
   * can do is reached with a session. */
  readonly sessionToken: string;
  readonly writeKey: StoredKey;
}
