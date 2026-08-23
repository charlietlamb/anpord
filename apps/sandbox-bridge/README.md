# Cloudflare Sandbox Bridge

This Worker exposes Cloudflare Sandbox to the eval service through Cloudflare's authenticated bridge API. It requires the Workers Paid plan and a deployment credential with `workers:write` and `containers:write`.

Set `SANDBOX_API_KEY` as a Worker secret, then deploy:

```sh
bunx wrangler secret put SANDBOX_API_KEY
bun run deploy
```

Configure the eval service with `CLOUDFLARE_SANDBOX_URL` and the same `CLOUDFLARE_SANDBOX_API_KEY`. For a token covering exactly one account, the adapter can discover the standard workers.dev URL and derive the bridge key from `CLOUDFLARE_API_TOKEN`; explicit bridge credentials are preferred in production.
