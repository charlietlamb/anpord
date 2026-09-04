/**
 * Where a trial's own words are left for its verifier to read.
 *
 * Under the sandbox home rather than the workspace, so a case free to assert
 * on a clean `git status` or on a fixture diff never sees them. Both are
 * written even when the agent said nothing, because a validator that has to
 * tell an absent file from an empty one ends up reporting a harness change as
 * a wrong answer.
 */
export const ANSWER_PATH = (home: string) => `${home}/.anpord-answer.txt`;

export const TRANSCRIPT_PATH = (home: string) =>
  `${home}/.anpord-transcript.txt`;

export const ANSWER_ENV = "ANPORD_ANSWER_FILE";

export const TRANSCRIPT_ENV = "ANPORD_TRANSCRIPT_FILE";
