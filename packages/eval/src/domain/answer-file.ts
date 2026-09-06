/* Under the sandbox home, not the workspace, so a case asserting on a clean
   `git status` never sees them. Written even when the agent said nothing. */
export const ANSWER_PATH = (home: string) => `${home}/.anpord-answer.txt`;

export const TRANSCRIPT_PATH = (home: string) =>
  `${home}/.anpord-transcript.txt`;

export const ANSWER_ENV = "ANPORD_ANSWER_FILE";

export const TRANSCRIPT_ENV = "ANPORD_TRANSCRIPT_FILE";
