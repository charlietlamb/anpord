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
