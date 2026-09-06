const POLL_MS = 100;

const sleep = (millis: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, millis));

export interface WaitOptions {
  /* Used verbatim in the timeout message. */
  readonly describe: string;
  /* Ends the wait early, so a dead process is a message rather than a full timeout. */
  readonly failed?: () => string | undefined;
  readonly timeoutMs: number;
}

export const waitUntil = async (
  ready: () => boolean | Promise<boolean>,
  { describe, failed, timeoutMs }: WaitOptions
) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await ready()) {
      return;
    }

    const failure = failed?.();
    if (failure !== undefined) {
      throw new Error(failure);
    }

    await sleep(POLL_MS);
  }

  throw new Error(`${describe} did not happen within ${timeoutMs}ms`);
};
