import { account } from "./schema/auth/accounts";
import { apikey } from "./schema/auth/api-keys";
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

/** drizzle-kit reads table exports, not the object, to diff against the database. */
export { account } from "./schema/auth/accounts";
export { apikey } from "./schema/auth/api-keys";
export { invitation } from "./schema/auth/invitations";
export { member } from "./schema/auth/members";
export { organization } from "./schema/auth/organizations";
export { session } from "./schema/auth/sessions";
export { user } from "./schema/auth/users";
export { verification } from "./schema/auth/verifications";
export { promptChannelEvent } from "./schema/prompts/prompt-channel-events";
export { promptChannel } from "./schema/prompts/prompt-channels";
export { promptVersion } from "./schema/prompts/prompt-versions";
export { prompt } from "./schema/prompts/prompts";

export const schema = {
  account,
  apikey,
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
