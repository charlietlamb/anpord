/* Under the sandbox home, not the workspace, so a case asserting on a clean
   `git status` never sees them. Written even when the agent said nothing. */
export const ANSWER_PATH = (home: string) => `${home}/.anpord-answer.txt`;

export const TRANSCRIPT_PATH = (home: string) =>
  `${home}/.anpord-transcript.txt`;

export const TURNS_PATH = (home: string) => `${home}/.anpord-turns.json`;
