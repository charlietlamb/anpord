import { comparisonSuite } from "./suite";

export default comparisonSuite("codex", [
  { harness: "codex", model: "gpt-5.6-sol", sandbox: "e2b" },
  { harness: "codex", model: "gpt-5.6-terra", sandbox: "e2b" },
]);
