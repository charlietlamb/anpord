/**
 * One line of the record. NDJSON because a session is append-only and a run
 * that dies part way through should leave everything up to the failure
 * readable, which a single JSON document would not.
 */
export interface SandboxEvent {
  readonly at: string;
  readonly data: Record<string, unknown>;
  readonly kind:
    | "session.start"
    | "session.end"
    | "command"
    | "file"
    | "dns"
    | "http"
    | "commit";
  /** Monotonic within a session, so ordering survives clock skew and a
   * collector that reconnects. */
  readonly seq: number;
  readonly sessionId: string;
}
