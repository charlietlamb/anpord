/**
 * A verifier read as the conditions it gates on.
 *
 * Derived rather than stored. The shell string is what runs and stays the only
 * truth about that; a second, structured copy would be a thing to keep in step
 * with it and a way for a screen to describe a check the sandbox never made.
 *
 * Most verifiers are one command -- the median stored is four characters,
 * `true`, and the real ones are `node --test` -- and those read as one step.
 * A verifier that gates on many separate conditions is written as those
 * conditions joined by `&&`; the longest here is 2891 characters holding
 * fifteen, which as a single line is a wall rather than something anybody
 * reads.
 */

/** Splits on `&&` outside single or double quotes, so an `&&` inside a script
 * handed to `node -e` stays part of its own step. */
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

/* Long enough to name what a step checks, short enough that a list of them
   stays a list. */
const SUMMARY_LIMIT = 72;

const shortened = (text: string) =>
  text.length > SUMMARY_LIMIT
    ? `${text.slice(0, SUMMARY_LIMIT).trimEnd()}…`
    : text;

/** The message a step throws, which is already a sentence written for a
 * person rather than for the shell. */
const THROWN = /(?:Error\(|throw )['"`]([^'"`]{4,})['"`]/;

/* A message built by concatenation ends where the value was joined on, so
   `'too many tabs: ' + tabs.length` would otherwise read as a sentence cut
   short rather than one naming what it checks. */
const TRAILING_JOIN = /[:,\s]+$/;

/** Any run of whitespace, so a script folded over lines reads as one. */
const WHITESPACE = /\s+/g;

/** A shell idiom whose meaning is plainer in words than in flags. Only the
 * common file and text checks: anything else is its own best description. */
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

/**
 * What a step checks, in a few words.
 *
 * Taken from the message the step throws where it has one, because that is
 * already a sentence written for a person: `throw new Error('navigation must
 * be an object')` names the check far better than the script around it does.
 * A bare file or text check is read as the condition it states, because
 * `test -f docs/docs.json` is a flag a reader has to decode and "docs/docs.json
 * exists" is not. Otherwise the command is its own best description and is
 * shown plainly.
 */
/**
 * A step read for a person, and how it was read.
 *
 * `message` is the sentence the step throws when it fails, so it names what
 * went wrong rather than what was checked. `condition` is a shell idiom read
 * as the state it asserts. `command` is the shell itself, whole rather than
 * cut, because a screen that sets it as code can wrap it and a screen that
 * cannot should shorten it on its own terms.
 */
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
