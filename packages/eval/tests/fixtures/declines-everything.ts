import { Option } from "effect";
import type { ResumableCommands, SandboxCache } from "../../src/ports/sandbox";

/**
 * What a handle in a test declares when the test is not about a capability.
 *
 * Spread into a fake handle so a test that cares about neither says so, and a
 * test that does care overrides the one it means.
 */
export const declinesEverything = {
  cache: Option.none<SandboxCache>(),
  resumable: Option.none<ResumableCommands>(),
};
