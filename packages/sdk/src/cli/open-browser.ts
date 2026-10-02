import { Command, CommandExecutor } from "@effect/platform";
import { Config, Effect, Option } from "effect";

/* Named so a run does not land in whichever browser the machine defaults to:
   SPHYNX_BROWSER picks one, and "none" prints the address instead of opening. */
const browserConfig = Config.string("SPHYNX_BROWSER").pipe(
  Config.option,
  Config.map(Option.getOrUndefined)
);

const opened = (url: string, chosen: string | undefined) => {
  if (process.platform === "darwin") {
    return chosen === undefined
      ? Command.make("open", url)
      : Command.make("open", "-a", chosen, url);
  }

  return process.platform === "win32"
    ? Command.make("start", url)
    : Command.make(chosen ?? "xdg-open", url);
};

export const openBrowser = (url: string) =>
  Effect.gen(function* () {
    const chosen = yield* browserConfig;

    if (chosen === "none") {
      return;
    }

    const executor = yield* CommandExecutor.CommandExecutor;

    yield* executor.exitCode(opened(url, chosen));
  }).pipe(Effect.ignore);
