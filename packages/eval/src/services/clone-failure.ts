/**
 * What a failed `git clone` actually means, for someone who has to fix it.
 *
 * GitHub answers a private repository and a repository that does not exist
 * with the same credential prompt, deliberately, so a reader cannot use the
 * error to discover which repositories exist. The message says both rather
 * than guessing at one and sending the reader to look for the wrong problem.
 */
const AUTHENTICATION = [
  "could not read username",
  "authentication failed",
  "invalid username or password",
  "terminal prompts disabled",
  "permission denied",
  "access denied",
];

const MISSING_REF = [
  "not our ref",
  "couldn't find remote ref",
  "unadvertised",
  "did not match",
];

/* git writes the url between the word and "not found" -- "repository
   'https://...' not found" -- so the phrase is never contiguous. */
const MISSING_REPOSITORY = [
  "not found",
  "does not appear to be a git repository",
];

const UNRESOLVABLE_HOST = [
  "could not resolve host",
  "unable to access",
  "connection refused",
  "connection timed out",
];

const matches = (haystack: string, needles: readonly string[]) =>
  needles.some((needle) => haystack.includes(needle));

export const cloneFailureReason = (
  url: string,
  ref: string | null,
  stderr: string,
  exitCode: number
): string => {
  const said = stderr.toLowerCase();

  /* A failure that names the ref is about the ref, whatever words surround
     it. Checked before the repository phrases because git reports an
     unreachable commit with "not found" too, and answering that with "install
     the app" sends the reader to fix a connection that already works. */
  if (
    ref !== null &&
    (matches(said, MISSING_REF) || said.includes(ref.toLowerCase()))
  ) {
    return `The repository ${url} has no ref ${ref}. Pin a commit that is still on the remote.`;
  }

  if (matches(said, AUTHENTICATION) || matches(said, MISSING_REPOSITORY)) {
    return `Could not read ${url}. Either it does not exist, or the GitHub app is not installed on it. Add it under Settings, then start the run again.`;
  }

  if (matches(said, UNRESOLVABLE_HOST)) {
    return `Could not reach ${url}. Check the URL is a clone url the sandbox can resolve.`;
  }

  const detail = lastMeaningfulLine(stderr);

  return detail === ""
    ? `Could not clone ${url}; git exited with status ${exitCode}.`
    : `Could not clone ${url}: ${detail}`;
};

/* git narrates progress on stderr, so the line that explains the failure is
   the last one, not the first. */
const lastMeaningfulLine = (stderr: string) =>
  stderr
    .split("\n")
    .map((line) => line.trim())
    .findLast((line) => line !== "" && !line.startsWith("Cloning into")) ?? "";
