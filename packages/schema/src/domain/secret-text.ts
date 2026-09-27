const REDACTED = "[redacted]";

const KNOWN_MINIMUM = 8;

const EDGE = "(?<![A-Za-z0-9_-])";

const HAS_DIGIT = "(?=[A-Za-z0-9._~+/-]*[0-9])";

const CREDENTIAL_SHAPES = [
  `${EDGE}sk-${HAS_DIGIT}[A-Za-z0-9_-]{20,}`,
  `${EDGE}[rs]k_(?:live|test)_[A-Za-z0-9]{10,}`,
  `${EDGE}am_sk_[A-Za-z0-9_-]+`,
  `${EDGE}anp_[A-Za-z0-9_-]{16,}`,
  `${EDGE}gh[pousr]_[A-Za-z0-9]{20,}`,
  `${EDGE}github_pat_[A-Za-z0-9_]{20,}`,
  `${EDGE}xox[abeoprs]-[A-Za-z0-9-]{10,}`,
  `${EDGE}(?:AKIA|ASIA)[A-Z0-9]{16}`,
  `${EDGE}AIza[A-Za-z0-9_-]{35}`,
  `${EDGE}eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}`,
  `(?<=\\b[Bb]earer\\s+)${HAS_DIGIT}[A-Za-z0-9._~+/-]{16,}=*`,
  "(?<=[a-z][a-z0-9+.-]*://[^/\\s:@]+:)[^/\\s@]+(?=@)",
  "-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----",
];

const CREDENTIAL = new RegExp(CREDENTIAL_SHAPES.join("|"), "g");

const escapedForms = (value: string) => [
  value,
  JSON.stringify(value).slice(1, -1),
];

export const redactSecrets = (
  text: string,
  known: readonly string[] = []
): string =>
  known
    .filter((value) => value.length >= KNOWN_MINIMUM)
    .flatMap(escapedForms)
    .toSorted((left, right) => right.length - left.length)
    .reduce((redacted, value) => redacted.replaceAll(value, REDACTED), text)
    .replace(CREDENTIAL, REDACTED);
