import { command, suite } from "anpord";

const profile = { dir: "./profile", name: "smoke" };

export default suite({
  id: "local-smoke",
  name: "local/smoke",
  prompt: "Write hello.txt containing hello.",
  cases: [
    {
      id: "writes-hello",
      name: "writes-hello",
      validate: command('test "$(cat hello.txt)" = hello'),
    },
  ],
  variants: [{ harness: "command", model: "probe", profile, sandbox: "local" }],
  trials: 1,
});
