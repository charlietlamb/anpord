import { Command, CommandExecutor } from "@effect/platform";
import { Effect } from "effect";

/* Named so a run does not land in whichever browser the machine defaults to:
   ANPORD_BROWSER picks one, and "none" prints the address instead of opening. */
const BROWSER = "ANPORD_BROWSER";

const opened = (url: string) => {
  const chosen = process.env[BROWSER];

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
    if (process.env[BROWSER] === "none") {
      return;
    }

    const executor = yield* CommandExecutor.CommandExecutor;

    yield* executor.exitCode(opened(url));
  }).pipe(Effect.ignore);
