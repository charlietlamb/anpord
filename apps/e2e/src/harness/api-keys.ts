import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sessionCookieHeader } from "./session-cookie";

export interface StoredKey {
  readonly key: string;
  readonly keyId: string;
  readonly name: string;
  readonly organizationId: string;
}

interface KeyFile {
  readonly keys: Record<string, StoredKey>;
}

const emptyFile: KeyFile = { keys: {} };

const readFile = (path: string): KeyFile => {
  if (!existsSync(path)) {
    return emptyFile;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as KeyFile;
  } catch {
    return emptyFile;
  }
};

const writeKeyFile = (path: string, file: KeyFile) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
};

export interface KeyOwner {
  readonly organizationId: string;
  readonly sessionToken: string;
}

export interface KeyStoreOptions {
  readonly authSecret: string;
  readonly baseUrl: string;
  readonly path: string;
}

/**
 * A key is shown once and never again, so the plaintext is kept here rather
 * than re-minted per run. Preserving it also lets a developer point the CLI or
 * a scratch script at the same organization the scenarios just exercised.
 */
export class ApiKeyStore {
  private file: KeyFile;

  private readonly path: string;
  private readonly baseUrl: string;
  private readonly authSecret: string;

  constructor(options: KeyStoreOptions) {
    this.path = options.path;
    this.baseUrl = options.baseUrl;
    this.authSecret = options.authSecret;
    this.file = readFile(options.path);
  }

  /**
   * Verified against the running server before reuse. A preserved key is only
   * useful while the organization it points at still exists, and a reset
   * database leaves the file pointing at nothing.
   *
   * A key that cannot be reused is replaced rather than reported, because the
   * alternative is a run where every scenario fails on an unrelated 404 and
   * nothing names the key file as the reason.
   */
  async resolve(name: string, owner: KeyOwner): Promise<StoredKey> {
    const existing = this.file.keys[name];

    if (existing && (await this.isUsable(existing, owner))) {
      return existing;
    }

    const minted = await this.mint(name, owner);

    if (!(await this.isUsable(minted, owner))) {
      throw new Error(
        `The key just minted for ${name} cannot read this organization. The stored keys are out of step with the database; delete ${this.path} and run again.`
      );
    }

    return minted;
  }

  private async isUsable(stored: StoredKey, owner: KeyOwner) {
    if (stored.organizationId !== owner.organizationId) {
      return false;
    }

    const response = await fetch(`${this.baseUrl}/v1/prompts.list`, {
      body: "{}",
      headers: {
        authorization: `Bearer ${stored.key}`,
        "content-type": "application/json",
      },
      method: "POST",
    });

    return response.status === 200;
  }

  /** Through the same endpoint the dashboard calls, so a run also covers the
   * path a person takes to get a key. */
  private async mint(name: string, owner: KeyOwner) {
    const response = await fetch(`${this.baseUrl}/api/auth/api-key/create`, {
      body: JSON.stringify({
        name: `${name}-${Date.now()}`,
        organizationId: owner.organizationId,
      }),
      headers: {
        cookie: await sessionCookieHeader(owner.sessionToken, this.authSecret),
        "content-type": "application/json",
        origin: this.baseUrl,
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Could not mint an api key (${response.status}): ${await response.text()}`
      );
    }

    const created = (await response.json()) as {
      readonly id: string;
      readonly key: string;
    };

    const stored: StoredKey = {
      key: created.key,
      keyId: created.id,
      name,
      organizationId: owner.organizationId,
    };

    this.file = { keys: { ...this.file.keys, [name]: stored } };
    writeKeyFile(this.path, this.file);

    return stored;
  }
}
