import { account } from "./schema/auth/accounts";
import { apikey } from "./schema/auth/api-keys";
import { invitation } from "./schema/auth/invitations";
import { member } from "./schema/auth/members";
import {
  jwks,
  oauthAccessToken,
  oauthApplication,
  oauthConsent,
} from "./schema/auth/oauth";
import { organization } from "./schema/auth/organizations";
import { session } from "./schema/auth/sessions";
import { user } from "./schema/auth/users";
import { verification } from "./schema/auth/verifications";
import { channel } from "./schema/prompts/channels";
import { promptChannelEvent } from "./schema/prompts/prompt-channel-events";
import { promptChannel } from "./schema/prompts/prompt-channels";
import { promptVersion } from "./schema/prompts/prompt-versions";
import { prompt } from "./schema/prompts/prompts";

export { account } from "./schema/auth/accounts";
export { apikey } from "./schema/auth/api-keys";
export { invitation } from "./schema/auth/invitations";
export { member } from "./schema/auth/members";
export {
  jwks,
  oauthAccessToken,
  oauthApplication,
  oauthConsent,
} from "./schema/auth/oauth";
export { organization } from "./schema/auth/organizations";
export { session } from "./schema/auth/sessions";
export { user } from "./schema/auth/users";
export { verification } from "./schema/auth/verifications";
export { channel } from "./schema/prompts/channels";
export { promptChannelEvent } from "./schema/prompts/prompt-channel-events";
export { promptChannel } from "./schema/prompts/prompt-channels";
export { promptVersion } from "./schema/prompts/prompt-versions";
export { prompt } from "./schema/prompts/prompts";

export const schema = {
  account,
  apikey,
  invitation,
  jwks,
  member,
  oauthAccessToken,
  oauthApplication,
  oauthConsent,
  organization,
  prompt,
  channel,
  promptChannel,
  promptChannelEvent,
  promptVersion,
  session,
  user,
  verification,
};
