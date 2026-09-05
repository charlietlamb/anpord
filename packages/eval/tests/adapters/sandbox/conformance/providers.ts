import type { Effect } from "effect";
import { makeCloudflareAdapter } from "../../../../src/adapters/sandbox/cloudflare";
import { makeDaytonaAdapter } from "../../../../src/adapters/sandbox/daytona";
import { makeE2BAdapter } from "../../../../src/adapters/sandbox/e2b";
import { makeModalAdapter } from "../../../../src/adapters/sandbox/modal";
import { makeUpstashAdapter } from "../../../../src/adapters/sandbox/upstash";
import { makeVercelAdapter } from "../../../../src/adapters/sandbox/vercel";
import type { SandboxAdapterShape } from "../../../../src/ports/sandbox";
import {
  hasCloudflare,
  hasDaytona,
  hasE2b,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../../../fixtures/credentials";
import { makeLocalAdapter } from "../../../support/local-sandbox";

/**
 * Every provider the product offers, and what each needs before it can be
 * exercised.
 *
 * A new provider is one row. The suite asserts the same capabilities against
 * every row, so a provider that cannot do something fails by name rather than
 * by being left out.
 */
export interface ProviderUnderTest {
  readonly adapter: Effect.Effect<SandboxAdapterShape>;
  readonly credentialled: boolean;
  readonly name: string;
  /** What a run must set for this provider to be exercised at all. */
  readonly needs: string;
  /** How long a sandbox takes to become useful, which differs by an order of
   * magnitude between providers. */
  readonly slowSeconds: number;
}

export const PROVIDERS: readonly ProviderUnderTest[] = [
  {
    adapter: makeLocalAdapter,
    /* The control: a real shell on the machine running the tests, so the suite
       proves the contract itself even with no credential at all. */
    credentialled: true,
    name: "local",
    needs: "nothing",
    slowSeconds: 1,
  },
  {
    adapter: makeDaytonaAdapter,
    credentialled: hasDaytona,
    name: "daytona",
    needs: "DAYTONA_API_KEY",
    slowSeconds: 30,
  },
  {
    adapter: makeE2BAdapter,
    credentialled: hasE2b,
    name: "e2b",
    needs: "E2B_API_KEY",
    slowSeconds: 5,
  },
  {
    adapter: makeUpstashAdapter,
    credentialled: hasUpstash,
    name: "upstash",
    needs: "UPSTASH_BOX_API_KEY",
    slowSeconds: 5,
  },
  {
    adapter: makeModalAdapter,
    credentialled: hasModal,
    name: "modal",
    needs: "MODAL_TOKEN_ID and MODAL_TOKEN_SECRET",
    slowSeconds: 10,
  },
  {
    adapter: makeCloudflareAdapter,
    credentialled: hasCloudflare,
    name: "cloudflare",
    needs: "CLOUDFLARE_API_TOKEN, or CLOUDFLARE_SANDBOX_URL with its API key",
    slowSeconds: 10,
  },
  {
    adapter: makeVercelAdapter,
    credentialled: hasVercel,
    name: "vercel",
    needs: "VERCEL_OIDC_TOKEN, or VERCEL_TOKEN with team and project ids",
    slowSeconds: 10,
  },
];
