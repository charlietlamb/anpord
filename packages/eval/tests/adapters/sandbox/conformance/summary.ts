import { PROVIDERS } from "./providers";

const HEADING = "sandbox provider conformance";

/**
 * What a run actually exercised, printed where a reader will see it.
 *
 * A suite that skips every provider for want of a credential is otherwise
 * indistinguishable from one that passed, which is how a green run came to
 * mean nothing at all.
 */
export const reportCoverage = () => {
  const exercised = PROVIDERS.filter((provider) => provider.credentialled);
  const skipped = PROVIDERS.filter((provider) => !provider.credentialled);

  const lines = [
    `\n${HEADING}: ${exercised.length} of ${PROVIDERS.length} providers exercised`,
    ...exercised.map((provider) => `  exercised  ${provider.name}`),
    ...skipped.map(
      (provider) => `  skipped    ${provider.name} — needs ${provider.needs}`
    ),
  ];

  process.stdout.write(`${lines.join("\n")}\n\n`);
};

/** The capabilities a provider declared, gathered as the suite runs so the
 * matrix is reported rather than inferred from which tests were green. */
export const declared = new Map<
  string,
  { readonly cache: boolean; readonly resumable: boolean }
>();

export const reportCapabilities = () => {
  if (declared.size === 0) {
    return;
  }

  const rows = [...declared.entries()].map(
    ([name, capabilities]) =>
      `  ${name.padEnd(12)} resumable=${capabilities.resumable} cache=${capabilities.cache}`
  );

  process.stdout.write(
    `\n${HEADING}: capabilities each provider declared\n${rows.join("\n")}\n\n`
  );
};
