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
import { credentialAuthAttempt } from "./schema/credentials/auth-attempts";
import { credentialConnection } from "./schema/credentials/connections";
import { githubInstallation } from "./schema/credentials/installations";
import { evalBaseline } from "./schema/evals/eval-baselines";
import { evalCell } from "./schema/evals/eval-cells";
import { evalEvent } from "./schema/evals/eval-events";
import { evalPlayground } from "./schema/evals/eval-playgrounds";
import { evalRun } from "./schema/evals/eval-runs";
import { evalTask } from "./schema/evals/eval-tasks";
import { evalTrial } from "./schema/evals/eval-trials";
import { channel } from "./schema/prompts/channels";
import { promptChannel } from "./schema/prompts/prompt-channels";
import { promptEvent } from "./schema/prompts/prompt-events";
import { promptReleaseVersion } from "./schema/prompts/prompt-release-versions";
import { promptRelease } from "./schema/prompts/prompt-releases";
import { promptVersion } from "./schema/prompts/prompt-versions";
import { prompt } from "./schema/prompts/prompts";

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
  evalBaseline,
  evalCell,
  evalEvent,
  evalPlayground,
  evalRun,
  evalTask,
  evalTrial,
  prompt,
  channel,
  promptChannel,
  promptEvent,
  promptRelease,
  promptReleaseVersion,
  promptVersion,
  session,
  user,
  verification,
  credentialAuthAttempt,
  credentialConnection,
  githubInstallation,
};
