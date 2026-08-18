import type { StoredKey } from "./harness/api-keys";
import type { Tenant } from "./harness/seed";

export interface World {
  readonly baseUrl: string;
  readonly databaseUrl: string;
  /** A workspace the CLI and generated declarations can write into. */
  readonly directory: string;
  readonly other: Tenant;
  readonly otherKey: StoredKey;
  readonly query: <Row>(
    sql: string,
    values?: readonly unknown[]
  ) => Promise<readonly Row[]>;
  readonly repositoryRoot: string;
  readonly tenant: Tenant;
  readonly writeKey: StoredKey;
}
