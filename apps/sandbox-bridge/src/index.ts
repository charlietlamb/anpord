import { Sandbox as SandboxBase } from "@cloudflare/sandbox";
import { bridge, WarmPool as WarmPoolBase } from "@cloudflare/sandbox/bridge";

export class Sandbox extends SandboxBase {}
export class WarmPool extends WarmPoolBase {}

export default bridge({
  fetch: () => new Response("Not Found", { status: 404 }),
});
