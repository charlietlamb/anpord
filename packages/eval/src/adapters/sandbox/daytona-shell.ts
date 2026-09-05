import { sandboxUnavailable } from "../../domain/errors";
import { quoted } from "./env-file";

export const HOME = "/home/daytona";
export const DEFAULT_TIMEOUT_MS = 120_000;

export const cdInto = (workspace: string, command: string) =>
  `cd ${quoted(workspace)} && ${command}`;

export const unavailable = (reason: unknown) =>
  sandboxUnavailable("daytona", reason);
