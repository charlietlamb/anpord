import { suite } from "anpord";
import { trials, variants } from "./config";
import { prepareSdk, validateSdk } from "./validators/sdk";

export default suite({
  id: "anpord-ci-sdk",
  name: "anpord-ci/sdk",
  prompt:
    "Create apps/e2e/sdk-smoke.mjs exporting async resolvePrompt(baseUrl, id, name). Use the locally built anpord SDK, with apiKey ci-fixture and cache disabled, to get the prompt by id with variables { name }, then return its content. Dispose the client. Do not use fetch directly, install another SDK, or contact external APIs. The verifier supplies a local mock API and checks the request and interpolated response.",
  cases: [
    {
      id: "sdk-resolve-prompt",
      name: "resolve-prompt",
      prepare: prepareSdk,
      validate: validateSdk,
    },
  ],
  variants,
  trials,
});
