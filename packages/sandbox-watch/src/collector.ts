import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { SandboxEvent } from "./event";

export interface CollectorOptions {
  /** Where the record is written inside the sandbox. A snapshot taken at the
   * end carries this directory, so the session survives even when the stream
   * did not. */
  readonly directory: string;
  /** Where the record is streamed. Absent means disk only, which is what a
   * run without network access gets. */
  readonly ingest?: string;
  readonly sessionId: string;
}

const FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH = 200;

/**
 * Writes every event to disk immediately and forwards batches to the ingest
 * endpoint. Disk first because it is the thing that cannot fail: a batch lost
 * to a network error is still on disk when the snapshot is taken.
 */
export class Collector {
  private seq = 0;
  private pending: SandboxEvent[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly path: string;
  private readonly options: CollectorOptions;

  constructor(options: CollectorOptions) {
    this.options = options;
    mkdirSync(options.directory, { recursive: true });
    this.path = join(options.directory, "events.ndjson");
  }

  start() {
    this.emit("session.start", {
      collector: "anpord-watch",
      startedAt: new Date().toISOString(),
    });

    if (this.options.ingest) {
      this.timer = setInterval(() => {
        this.flush().catch(() => undefined);
      }, FLUSH_INTERVAL_MS);
    }
  }

  emit(kind: SandboxEvent["kind"], data: Record<string, unknown>) {
    this.seq += 1;
    const event: SandboxEvent = {
      at: new Date().toISOString(),
      data,
      kind,
      seq: this.seq,
      sessionId: this.options.sessionId,
    };

    appendFileSync(this.path, `${JSON.stringify(event)}\n`);
    this.pending.push(event);

    if (this.pending.length >= MAX_BATCH) {
      this.flush().catch(() => undefined);
    }
  }

  async flush() {
    if (!this.options.ingest || this.pending.length === 0) {
      return;
    }

    const batch = this.pending;
    this.pending = [];

    try {
      await fetch(this.options.ingest, {
        body: batch.map((event) => JSON.stringify(event)).join("\n"),
        headers: { "content-type": "application/x-ndjson" },
        method: "POST",
      });
    } catch {
      /* The disk copy is authoritative, so a failed send is not worth
         retrying into an unbounded buffer. The snapshot carries what the
         stream dropped. */
    }
  }

  async stop() {
    this.emit("session.end", { endedAt: new Date().toISOString() });

    if (this.timer) {
      clearInterval(this.timer);
    }

    await this.flush();
  }
}
