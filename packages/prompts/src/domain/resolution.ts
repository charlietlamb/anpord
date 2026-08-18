import type {
  ChannelName,
  PromptSelector,
  VersionNumber,
} from "@anpord/schema/domain/prompts";
import { LATEST } from "@anpord/schema/domain/prompts";

/**
 * Which version a request asks for.
 *
 * `Default` is a request that named nothing. The organisation decides which
 * channel answers it, so the choice belongs to the service that can read that
 * setting rather than to a pure function over the selector.
 *
 * `Latest` is a name rather than a stored channel, so it is read from the
 * version table and cannot fall out of step with it.
 */
export type Resolution =
  | { readonly _tag: "ByVersion"; readonly version: VersionNumber }
  | { readonly _tag: "ByChannel"; readonly channel: ChannelName }
  | { readonly _tag: "Latest" }
  | { readonly _tag: "Default" };

export const resolutionFor = (selector: PromptSelector): Resolution => {
  if (selector.version !== undefined) {
    return { _tag: "ByVersion", version: selector.version };
  }

  if (selector.channel === undefined) {
    return { _tag: "Default" };
  }

  return selector.channel === LATEST
    ? { _tag: "Latest" }
    : { _tag: "ByChannel", channel: selector.channel };
};

/** The channel a caller should be told answered, once the default is known. */
export const answeringChannel = (
  resolution: Resolution,
  fallbackChannel: ChannelName | null
): ChannelName | null => {
  switch (resolution._tag) {
    case "ByVersion":
      return null;
    case "Default":
      return fallbackChannel;
    case "Latest":
      return LATEST;
    default:
      return resolution.channel;
  }
};
