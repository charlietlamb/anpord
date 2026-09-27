import type { Permission } from "./permissions";

const OIDC_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

const PROMPT_SCOPES = ["prompts:read", "prompts:write"] as const;
const CHANNEL_SCOPES = ["channels:read", "channels:write"] as const;
const EVAL_SCOPES = ["evals:read", "evals:write"] as const;
export const MCP_SCOPES = [...PROMPT_SCOPES, ...CHANNEL_SCOPES, ...EVAL_SCOPES];

export const API_SCOPES: readonly Permission[] = [...MCP_SCOPES];

export const SUPPORTED_SCOPES = [...OIDC_SCOPES, ...API_SCOPES];
