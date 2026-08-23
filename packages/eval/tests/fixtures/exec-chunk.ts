import type { ExecChunk } from "../../src/ports/sandbox";

const AT = 1000;

export const stdout = (data: string): ExecChunk => ({
  at: AT,
  data,
  stream: "stdout",
});

export const exit = (exitCode: number): ExecChunk => ({
  at: AT,
  exitCode,
  stream: "exit",
});
