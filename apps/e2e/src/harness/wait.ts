const POLL_MS = 100;

const sleep = (millis: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, millis));

export interface WaitOptions {
  /** Why the wait exists, used verbatim when it runs out of time. */
  readonly describe: string;
  /** Reports what went wrong when the thing being waited for cannot happen,
   * so a dead process is a message rather than a full timeout. */
  readonly failed?: () => string | undefined;
  readonly timeoutMs: number;
}

/**
 * Polls until a condition holds, gives up on its own deadline, and gives up
 * early when the thing being waited for has already failed. The timeout names
 * itself in the message, so the number and the text cannot drift apart.
 */
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
