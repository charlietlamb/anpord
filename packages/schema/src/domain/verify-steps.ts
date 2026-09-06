/* Derived from the shell string rather than stored, so a screen can never describe a check the sandbox did not make.
   Splits on `&&` outside quotes, so an `&&` inside a `node -e` script stays in its step. */
export const stepsOf = (command: string): readonly string[] => {
  const steps: string[] = [];
  let quote: string | null = null;
  let start = 0;

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (character === "&" && command[index + 1] === "&") {
      steps.push(command.slice(start, index));
      index += 1;
      start = index + 1;
    }
  }

  steps.push(command.slice(start));

  return steps.map((step) => step.trim()).filter((step) => step !== "");
};

const SUMMARY_LIMIT = 72;

const shortened = (text: string) =>
  text.length > SUMMARY_LIMIT
    ? `${text.slice(0, SUMMARY_LIMIT).trimEnd()}…`
    : text;

const THROWN = /(?:Error\(|throw )['"`]([^'"`]{4,})['"`]/;

/* A concatenated message ends where the value was joined on: `'too many tabs: ' + n`. */
const TRAILING_JOIN = /[:,\s]+$/;

const WHITESPACE = /\s+/g;

/* Only the common file and text checks: anything else is its own best description. */
const IDIOMS: readonly (readonly [RegExp, (m: RegExpMatchArray) => string])[] =
  [
    [/^test -f (\S+)$/, (m) => `${m[1]} exists`],
    [/^test -d (\S+)$/, (m) => `${m[1]} is a directory`],
    [/^test ! -f (\S+)$/, (m) => `${m[1]} is absent`],
    [/^test ! -d (\S+)$/, (m) => `no ${m[1]} directory`],
    [/^test -s (\S+)$/, (m) => `${m[1]} is not empty`],
    [/^test -x (\S+)$/, (m) => `${m[1]} is executable`],
    [/^grep -q[a-zA-Z]* (\S+) (\S+)$/, (m) => `${m[2]} contains ${m[1]}`],
    [
      /^! grep -q[a-zA-Z]* (\S+) (\S+)$/,
      (m) => `${m[2]} does not contain ${m[1]}`,
    ],
  ];

const QUOTED = /^(["'])(.*)\1$/;

const unquoted = (text: string) => text.replace(QUOTED, "$2");

const idiomOf = (step: string): string | undefined => {
  for (const [pattern, read] of IDIOMS) {
    const match = step.match(pattern);

    if (match !== null) {
      return read(match.map(unquoted) as unknown as RegExpMatchArray);
    }
  }

  return;
};

/* `command` carries the whole shell, uncut: a screen that sets it as code wraps it, one that cannot shortens it itself. */
export interface StepReading {
  readonly kind: "command" | "condition" | "message";
  readonly text: string;
}

export const readingOf = (step: string): StepReading => {
  const flat = step.replace(WHITESPACE, " ").trim();
  const thrown = step.match(THROWN);
  const found = thrown?.[1]?.trim().replace(TRAILING_JOIN, "");

  if (found !== undefined && found !== "") {
    return { kind: "message", text: found };
  }

  const condition = idiomOf(flat);

  return condition === undefined
    ? { kind: "command", text: flat }
    : { kind: "condition", text: condition };
};

export const summaryOf = (step: string): string =>
  shortened(readingOf(step).text);
