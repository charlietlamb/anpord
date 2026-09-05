import { Option } from "effect";
import type { ResumableCommands, SandboxCache } from "../../ports/sandbox";

/**
 * What a provider says it cannot do.
 *
 * Named rather than written as `Option.none()` at each adapter, so a handle
 * that declines a capability reads as a decision and a reader can find every
 * provider that made it.
 *
 * Declining resumable commands is not declining to run a long command: the
 * caller falls back to a streamed exec, which holds the call open for the
 * length of the command instead of polling for it.
 */
export const noResumableCommands: Option.Option<ResumableCommands> =
  Option.none();

/** For a provider with nowhere to keep what a prepare built. */
export const noCache: Option.Option<SandboxCache> = Option.none();
