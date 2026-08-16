import type {
  ChannelName,
  PromptSelector,
  VersionNumber,
} from "@anpord/schema/domain/prompts";
import { LATEST, PRODUCTION } from "@anpord/schema/domain/prompts";

export type Resolution =
  | { readonly _tag: "ByVersion"; readonly version: VersionNumber }
  | { readonly _tag: "Latest" }
  | { readonly _tag: "ByChannel"; readonly channel: ChannelName };

export const resolutionFor = (selector: PromptSelector): Resolution => {
  if (selector.version !== undefined) {
    return { _tag: "ByVersion", version: selector.version };
  }

  const channel = selector.channel ?? PRODUCTION;
  return channel === LATEST
    ? { _tag: "Latest" }
    : { _tag: "ByChannel", channel };
};

export const answeringChannel = (
  resolution: Resolution
): ChannelName | null => {
  switch (resolution._tag) {
    case "ByVersion":
      return null;
    case "Latest":
      return LATEST;
    default:
      return resolution.channel;
  }
};
