# Credentials

`/v1` accepts two bearer credentials, both resolving to the same `Actor` so
nothing downstream knows which was used.

| Credential | Identity | Organization |
| --- | --- | --- |
| `anp_…` API key | the member who minted it | the key's own |
| OAuth access token | the token's user | that user's membership |

The organization is read from membership rather than from the credential, so a
token cannot widen its own reach by naming an organization.

## Audience binding

The specification asks a resource server to reject tokens issued for a different
resource (RFC 8707). Better Auth's MCP plugin advertises the `resource`
parameter in its metadata but does not store it against the token, so that check
cannot be made here yet: tokens are opaque and validated by lookup rather than
by an `aud` claim.

The practical exposure is limited while this authorization server issues tokens
for one resource. It matters once a second resource exists, because a token
minted for one would be accepted by the other.
