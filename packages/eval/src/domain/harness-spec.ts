import { HarnessName } from "./cell";

export interface HarnessSpec {
  readonly name: HarnessName;
  readonly version: string;
}

const NAMES = new Set<string>(HarnessName.literals);

/** Reads `codex@0.144.4` into a harness and its version. */
export const parseHarness = (spec: string): HarnessSpec | null => {
  const at = spec.lastIndexOf("@");

  if (at <= 0 || at === spec.length - 1) {
    return null;
  }

  const name = spec.slice(0, at);
  const version = spec.slice(at + 1);

  if (!NAMES.has(name)) {
    return null;
  }

  return { name: name as HarnessName, version };
};

export const formatHarness = (harness: HarnessSpec) =>
  `${harness.name}@${harness.version}`;
