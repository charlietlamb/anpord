import { comparisonSuite } from "./suite";

export default comparisonSuite("all", [
  { harness: "claude", model: "claude-haiku-4-5-20251001", sandbox: "e2b" },
  { harness: "claude", model: "claude-sonnet-5", sandbox: "e2b" },
  { harness: "claude", model: "claude-opus-5", sandbox: "e2b" },
  { harness: "codex", model: "gpt-5.6-sol", sandbox: "e2b" },
  { harness: "codex", model: "gpt-5.6-terra", sandbox: "e2b" },
]);
