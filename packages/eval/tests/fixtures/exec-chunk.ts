import type { ExecChunk } from "../../src/ports/sandbox";

/* A fixed moment, so a test asserting on output never depends on the clock.
   Timing is proved by the conformance suite against real adapters, which is
   the only place it means anything. */
const AT = 1000;

export const stdout = (data: string): ExecChunk => ({
  at: AT,
  data,
  stream: "stdout",
});

export const stderr = (data: string): ExecChunk => ({
  at: AT,
  data,
  stream: "stderr",
});

export const exit = (exitCode: number): ExecChunk => ({
  at: AT,
  exitCode,
  stream: "exit",
});
