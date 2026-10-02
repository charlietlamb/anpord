import { resolve } from "node:path";
import { createEmitter, env } from "../index";
import { exitCodes } from "./outcome";
import { runEve } from "./run";
import { type EveServer, serveEve } from "./serve";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const runEveTrial = async (dir = "."): Promise<number> => {
  const { model, prompt, workspace } = env();
  const emitter = createEmitter();
  let server: EveServer | undefined;

  try {
    server = await serveEve({ cwd: resolve(workspace, dir) });
    const outcome = await runEve({ emitter, model, prompt, url: server.url });
    return exitCodes[outcome.status];
  } catch (error) {
    emitter.finished(`failed: ${messageOf(error)}`);
    return exitCodes.failed;
  } finally {
    await server?.close();
  }
};
