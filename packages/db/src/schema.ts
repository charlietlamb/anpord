export * from "./schema/auth/accounts";
export * from "./schema/auth/invitations";
export * from "./schema/auth/members";
export * from "./schema/auth/organizations";
export * from "./schema/auth/sessions";
export * from "./schema/auth/users";
export * from "./schema/auth/verifications";
export * from "./schema/prompts/prompt-channel-events";
export * from "./schema/prompts/prompt-channels";
export * from "./schema/prompts/prompt-versions";
export * from "./schema/prompts/prompts";

import { account } from "./schema/auth/accounts";
import { invitation } from "./schema/auth/invitations";
import { member } from "./schema/auth/members";
import { organization } from "./schema/auth/organizations";
import { session } from "./schema/auth/sessions";
import { user } from "./schema/auth/users";
import { verification } from "./schema/auth/verifications";
import { promptChannelEvent } from "./schema/prompts/prompt-channel-events";
import { promptChannel } from "./schema/prompts/prompt-channels";
import { promptVersion } from "./schema/prompts/prompt-versions";
import { prompt } from "./schema/prompts/prompts";

export const schema = {
  account,
  invitation,
  member,
  organization,
  prompt,
  promptChannel,
  promptChannelEvent,
  promptVersion,
  session,
  user,
  verification,
};
