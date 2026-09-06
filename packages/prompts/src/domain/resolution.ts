import type {
  ChannelName,
  PromptSelector,
  VersionNumber,
} from "@anpord/schema/domain/prompts";
import { LATEST } from "@anpord/schema/domain/prompts";

/* `Default` names nothing and is settled by the service that can read the
   organisation's setting; `Latest` is read from the version table. */
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
