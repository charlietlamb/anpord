import { defineEval, empty } from "anpord";

export default defineEval({
  name: "anpord-models/claude-smoke",
  source: empty,
  prompt:
    "Create hello.txt containing exactly hello. Do not install tools or contact external APIs.",
  cases: [{ name: "writes-hello", verify: 'test "$(cat hello.txt)" = hello' }],
  tasks: [
    { harness: "claude", model: "claude-haiku-4-5-20251001", sandbox: "e2b" },
  ],
  trials: 1,
});
