import { command, empty, suite } from "anpord";

export default suite({
  id: "anpord-models-claude-smoke",
  name: "anpord-models/claude-smoke",
  source: empty,
  prompt:
    "Create hello.txt containing exactly hello. Do not install tools or contact external APIs.",
  cases: [
    {
      id: "claude-smoke-writes-hello",
      name: "writes-hello",
      validate: command('test "$(cat hello.txt)" = hello'),
    },
  ],
  variants: [
    { harness: "claude", model: "claude-haiku-4-5-20251001", sandbox: "e2b" },
  ],
  trials: 1,
});
