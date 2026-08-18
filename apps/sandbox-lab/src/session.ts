import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Sandbox } from "e2b";

export interface Recorded {
  readonly at: string;
  readonly data: Record<string, unknown>;
  readonly kind: string;
  readonly seq: number;
}

/**
 * The record the sandbox cannot touch. Everything collected inside the guest
 * can be edited by whatever is running there, so the journal kept out here is
 * the one that stays true, and the in-guest signals are enrichment on top.
 */
export class Session {
  private seq = 0;
  private readonly path: string;

  readonly events: Recorded[] = [];

  readonly id: string;

  constructor(id: string, directory: string) {
    this.id = id;
    mkdirSync(directory, { recursive: true });
    this.path = join(directory, `${id}.ndjson`);
  }

  record(kind: string, data: Record<string, unknown>) {
    this.seq += 1;
    const event: Recorded = {
      at: new Date().toISOString(),
      data,
      kind,
      seq: this.seq,
    };

    this.events.push(event);
    appendFileSync(this.path, `${JSON.stringify(event)}\n`);
    return event;
  }

  /**
   * Every command the agent issues goes through here, so the journal carries
   * the exit code the guest-side trap cannot see and the timing the provider
   * does not keep.
   */
  async run(
    sandbox: Sandbox,
    command: string,
    options: { readonly cwd?: string; readonly expectFailure?: boolean } = {}
  ) {
    const started = Date.now();

    const result = await sandbox.commands
      .run(command, { cwd: options.cwd ?? "/home/user/workspace" })
      .catch((cause: unknown) => {
        const failure = cause as {
          exitCode?: number;
          stdout?: string;
          stderr?: string;
        };
        return {
          exitCode: failure.exitCode ?? 1,
          stderr: failure.stderr ?? String(cause),
          stdout: failure.stdout ?? "",
        };
      });

    this.record("command", {
      command,
      cwd: options.cwd ?? "/home/user/workspace",
      durationMs: Date.now() - started,
      exitCode: result.exitCode,
      expectedFailure: options.expectFailure === true,
      stderr: result.stderr.slice(0, 4000),
      stdout: result.stdout.slice(0, 4000),
    });

    return result;
  }
}
