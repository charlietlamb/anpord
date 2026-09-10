import type { EvalCell, EvalSetup } from "@anpord/schema/domain/evals";

export interface SharedSetup {
  readonly prepareName: string | null;
  readonly prompt: string | null;
  /* True when the prompt is only the part every case begins with, so the view
     can say the rest varies rather than present one case's text as the run's. */
  readonly promptVaries: boolean;
  readonly repoRef: string | null;
  readonly repoUrl: string | null;
  readonly verifyCommand: string | null;
}

const same = <T>(values: readonly T[]) =>
  values.length > 0 && values.every((value) => value === values[0]);

const sharedValue = <T>(values: readonly T[]) =>
  same(values) ? (values[0] as T) : null;

/* Prompts are stored with each case's variables already substituted, so what
   the cases have in common is the text before they diverge. */
const commonPrefix = (prompts: readonly string[]) => {
  const [first, ...rest] = prompts;

  if (first === undefined) {
    return "";
  }

  let end = first.length;

  for (const prompt of rest) {
    let at = 0;

    while (at < end && prompt[at] === first[at]) {
      at += 1;
    }

    end = at;
  }

  return first.slice(0, end);
};

/* A prefix that stops mid-sentence reads worse than showing nothing, so it is
   trimmed back to the last line break the cases still agreed on. */
const wholeLines = (prefix: string) => {
  const at = prefix.lastIndexOf("\n");

  return at === -1 ? "" : prefix.slice(0, at).trimEnd();
};

export const sharedSetupOf = (
  cells: readonly EvalCell[]
): SharedSetup | null => {
  const setups = cells
    .map((cell) => cell.setup)
    .filter((setup): setup is EvalSetup => setup !== null);

  if (setups.length === 0) {
    return null;
  }

  const prompts = setups.map((setup) => setup.prompt);
  const whole = same(prompts);
  const prompt = whole ? prompts[0] : wholeLines(commonPrefix(prompts));

  return {
    prepareName: sharedValue(setups.map((setup) => setup.prepareName)),
    prompt: prompt === "" ? null : (prompt ?? null),
    promptVaries: !whole,
    repoRef: sharedValue(setups.map((setup) => setup.repoRef)),
    repoUrl: sharedValue(setups.map((setup) => setup.repoUrl)),
    verifyCommand: sharedValue(setups.map((setup) => setup.verifyCommand)),
  };
};
