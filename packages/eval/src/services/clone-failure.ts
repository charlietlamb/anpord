import { Array as Arr, Option, pipe } from "effect";

interface Diagnosis {
  readonly kind: "access" | "network" | "ref";
  readonly saying: readonly string[];
}

const DIAGNOSES: readonly Diagnosis[] = [
  {
    kind: "ref",
    saying: [
      "not our ref",
      "couldn't find remote ref",
      "unadvertised",
      "did not match",
    ],
  },
  {
    kind: "access",
    saying: [
      "could not read username",
      "authentication failed",
      "invalid username or password",
      "terminal prompts disabled",
      "permission denied",
      "access denied",
      "not found",
      "does not appear to be a git repository",
    ],
  },
  {
    kind: "network",
    saying: [
      "could not resolve host",
      "unable to access",
      "connection refused",
      "connection timed out",
    ],
  },
];

const diagnose = (said: string, ref: string | null) =>
  pipe(
    DIAGNOSES,
    Arr.findFirst(
      ({ kind, saying }) =>
        (kind !== "ref" || ref !== null) &&
        saying.some((phrase) => said.includes(phrase))
    ),
    Option.map(({ kind }) => kind),
    Option.orElse(() =>
      ref !== null && said.includes(ref.toLowerCase())
        ? Option.some("ref" as const)
        : Option.none()
    )
  );

export const cloneFailureReason = (
  url: string,
  ref: string | null,
  stderr: string,
  exitCode: number
): string =>
  Option.match(diagnose(stderr.toLowerCase(), ref), {
    onNone: () => unrecognised(url, stderr, exitCode),
    onSome: (kind) => {
      switch (kind) {
        case "ref":
          return `The repository ${url} has no ref ${ref}. Pin a commit that is still on the remote.`;
        case "access":
          return `Could not read ${url}. Either it does not exist, or the GitHub app is not installed on it. Add it under Settings, then start the run again.`;
        default:
          return `Could not reach ${url}. Check the URL is a clone url the sandbox can resolve.`;
      }
    },
  });

const unrecognised = (url: string, stderr: string, exitCode: number) =>
  pipe(
    lastMeaningfulLine(stderr),
    Option.match({
      onNone: () =>
        `Could not clone ${url}; git exited with status ${exitCode}.`,
      onSome: (detail) => `Could not clone ${url}: ${detail}`,
    })
  );

const lastMeaningfulLine = (stderr: string) =>
  pipe(
    stderr.split("\n"),
    Arr.map((line) => line.trim()),
    Arr.findLast((line) => line !== "" && !line.startsWith("Cloning into"))
  );
