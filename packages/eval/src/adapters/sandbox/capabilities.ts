import { Option } from "effect";
import type { ResumableCommands, SandboxCache } from "../../ports/sandbox";

/* Named rather than `Option.none()` at each adapter, so declining reads as a
   decision. Declining resumable commands only forces the streamed-exec fallback. */
export const noResumableCommands: Option.Option<ResumableCommands> =
  Option.none();

export const noCache: Option.Option<SandboxCache> = Option.none();
