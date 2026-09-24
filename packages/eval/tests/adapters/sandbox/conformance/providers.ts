import { ConfigProvider, Effect } from "effect";
import { cloudflareAdapter } from "../../../../src/adapters/sandbox/cloudflare";
import { daytonaAdapter } from "../../../../src/adapters/sandbox/daytona";
import { e2bAdapter } from "../../../../src/adapters/sandbox/e2b";
import { makeLocalAdapter } from "../../../../src/adapters/sandbox/local";
import { modalAdapter } from "../../../../src/adapters/sandbox/modal";
import { upstashAdapter } from "../../../../src/adapters/sandbox/upstash";
import { vercelAdapter } from "../../../../src/adapters/sandbox/vercel";
import type { SandboxAdapterShape } from "../../../../src/ports/sandbox";
import {
  hasCloudflare,
  hasDaytona,
  hasE2b,
  hasModal,
  hasUpstash,
  hasVercel,
} from "../../../fixtures/credentials";

export interface ProviderUnderTest {
  readonly adapter: Effect.Effect<SandboxAdapterShape>;
  readonly credentialled: boolean;
  readonly name: string;
  readonly needs: string;
  readonly slowSeconds: number;
}

export const PROVIDERS: readonly ProviderUnderTest[] = [
  {
    adapter: makeLocalAdapter.pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([["ANPORD_LOCAL_SANDBOX", "true"]]), {
          pathDelim: ".",
        }).pipe(ConfigProvider.orElse(() => ConfigProvider.fromEnv()))
      )
    ),
    credentialled: true,
    name: "local",
    needs: "nothing",
    slowSeconds: 1,
  },
  {
    adapter: daytonaAdapter(),
    credentialled: hasDaytona,
    name: "daytona",
    needs: "DAYTONA_API_KEY",
    slowSeconds: 30,
  },
  {
    adapter: e2bAdapter(),
    credentialled: hasE2b,
    name: "e2b",
    needs: "E2B_API_KEY",
    slowSeconds: 5,
  },
  {
    adapter: upstashAdapter(),
    credentialled: hasUpstash,
    name: "upstash",
    needs: "UPSTASH_BOX_API_KEY",
    slowSeconds: 5,
  },
  {
    adapter: modalAdapter(),
    credentialled: hasModal,
    name: "modal",
    needs: "MODAL_TOKEN_ID and MODAL_TOKEN_SECRET",
    slowSeconds: 10,
  },
  {
    adapter: cloudflareAdapter(),
    credentialled: hasCloudflare,
    name: "cloudflare",
    needs: "CLOUDFLARE_API_TOKEN, or CLOUDFLARE_SANDBOX_URL with its API key",
    slowSeconds: 10,
  },
  {
    adapter: vercelAdapter(),
    credentialled: hasVercel,
    name: "vercel",
    needs: "VERCEL_OIDC_TOKEN, or VERCEL_TOKEN with team and project ids",
    slowSeconds: 10,
  },
];
